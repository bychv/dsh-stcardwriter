import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { JsonObject, JsonValue, TavernAsset } from './types.js'
import { isObject } from './format.js'

export type PresetPlusRole = 'system' | 'user' | 'assistant'
export type PresetPlusConflictPolicy = 'error' | 'overwrite' | 'rename'

export interface PresetPlusEntry {
  role: PresetPlusRole
  text: string
  enabled: boolean
}

export interface PresetPlusPreset {
  id: string
  name: string
  autoMode: boolean
  entries: PresetPlusEntry[]
}

export interface PresetConversionReport {
  preset: PresetPlusPreset
  sourceFormat: string
  converted: number
  skipped: Array<{ identifier: string; reason: string }>
  warnings: string[]
}

interface ConvertOptions {
  id?: string
  name?: string
  autoMode?: boolean
}

interface InstallOptions {
  conflict?: PresetPlusConflictPolicy
  activate?: boolean
  dshHome?: string
}

function text(value: JsonValue | undefined): string {
  return typeof value === 'string' ? value : ''
}

function role(value: JsonValue | undefined, systemPrompt: JsonValue | undefined): PresetPlusRole {
  if (value === 'system' || value === 'user' || value === 'assistant') return value
  return systemPrompt === false ? 'user' : 'system'
}

export function presetPlusId(value: string): string {
  const normalized = value.normalize('NFKC').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return normalized || 'tavern-preset'
}

function staticChatCompletionEntries(data: JsonObject, skipped: PresetConversionReport['skipped']): PresetPlusEntry[] {
  const prompts = Array.isArray(data.prompts) ? data.prompts.filter(isObject) : []
  const byId = new Map(prompts.map((prompt, index) => [String(prompt.identifier ?? index), { prompt, index }]))
  const groups = Array.isArray(data.prompt_order) ? data.prompt_order.filter(isObject) : []
  const preferred = groups.find(group => group.character_id === 100001) ?? groups[0]
  const ordered: Array<{ prompt: JsonObject; identifier: string; enabled: boolean }> = []
  const seen = new Set<number>()

  if (preferred && Array.isArray(preferred.order)) {
    for (const item of preferred.order.filter(isObject)) {
      const identifier = String(item.identifier ?? '')
      const match = byId.get(identifier)
      if (!match) {
        skipped.push({ identifier, reason: 'prompt_order 引用了不存在的 prompt' })
        continue
      }
      seen.add(match.index)
      ordered.push({ prompt: match.prompt, identifier, enabled: item.enabled !== false })
    }
  }

  for (const [index, prompt] of prompts.entries()) {
    if (seen.has(index)) continue
    const identifier = String(prompt.identifier ?? index)
    ordered.push({ prompt, identifier, enabled: preferred ? false : prompt.enabled !== false })
  }

  const entries: PresetPlusEntry[] = []
  for (const item of ordered) {
    if (item.prompt.marker === true) {
      skipped.push({ identifier: item.identifier, reason: 'SillyTavern 动态 marker 无法转换为静态 Preset Plus 条目' })
      continue
    }
    const content = text(item.prompt.content)
    if (!content.trim()) {
      skipped.push({ identifier: item.identifier, reason: '提示词正文为空' })
      continue
    }
    entries.push({ role: role(item.prompt.role, item.prompt.system_prompt), text: content, enabled: item.enabled })
  }

  const prefill = text(data.assistant_prefill)
  if (prefill.trim()) entries.push({ role: 'assistant', text: prefill, enabled: true })
  return entries
}

export function convertTavernPresetToPresetPlus(asset: TavernAsset, options: ConvertOptions = {}): PresetConversionReport {
  if (asset.kind !== 'preset') throw new Error('只能转换酒馆预设资源')
  const skipped: PresetConversionReport['skipped'] = []
  const warnings: string[] = []
  const data = asset.data
  let entries: PresetPlusEntry[] = []

  if (asset.format === 'chat-completion-preset' || Array.isArray(data.prompts)) {
    entries = staticChatCompletionEntries(data, skipped)
  } else if (typeof data.content === 'string' || typeof data.system_prompt === 'string') {
    const main = text(data.content) || text(data.system_prompt)
    if (main.trim()) entries.push({ role: 'system', text: main, enabled: true })
    const postHistory = text(data.post_history)
    if (postHistory.trim()) entries.push({ role: 'system', text: postHistory, enabled: true })
  } else if (asset.format === 'context-preset' && typeof data.story_string === 'string') {
    entries.push({ role: 'system', text: data.story_string, enabled: true })
    warnings.push('Context 模板中的 SillyTavern/Handlebars 宏会按原文保留，Preset Plus 不负责展开这些宏')
  }

  if (entries.length === 0) {
    throw new Error(`预设 ${asset.name} 没有可转换的静态提示词；Instruct/TextGen 参数预设不能直接转换为 Preset Plus`)
  }
  if (entries[0]?.role !== 'system') {
    entries.unshift({ role: 'system', text: '', enabled: true })
    warnings.push('源预设没有首条 system 提示词，已添加 Preset Plus 所需的空 system 条目')
  }

  const name = options.name?.trim() || asset.name || text(data.name) || '酒馆预设'
  const preset: PresetPlusPreset = {
    id: presetPlusId(options.id?.trim() || name),
    name,
    autoMode: options.autoMode !== false,
    entries,
  }
  return { preset, sourceFormat: asset.format, converted: entries.length, skipped, warnings }
}

export function presetPlusPresetFromAsset(asset: TavernAsset): PresetPlusPreset {
  if (asset.kind !== 'preset' || asset.format !== 'preset-plus-preset') throw new Error('只能写入已转换的 preset-plus-preset 资源')
  const data = asset.data
  const id = typeof data.id === 'string' && data.id.trim() ? presetPlusId(data.id) : presetPlusId(asset.name)
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : asset.name.trim()
  if (!name) throw new Error('Preset Plus 预设名称不能为空')
  if (!Array.isArray(data.entries) || data.entries.length === 0) throw new Error('Preset Plus 预设至少需要一个条目')
  const entries = data.entries.map((value, index): PresetPlusEntry => {
    if (!isObject(value)) throw new Error(`Preset Plus 条目 #${index + 1} 必须是对象`)
    if (value.role !== 'system' && value.role !== 'user' && value.role !== 'assistant') throw new Error(`Preset Plus 条目 #${index + 1} 的 role 必须是 system、user 或 assistant`)
    if (typeof value.text !== 'string') throw new Error(`Preset Plus 条目 #${index + 1} 的 text 必须是字符串`)
    return { role: value.role, text: value.text, enabled: value.enabled !== false }
  })
  if (entries[0]?.role !== 'system') throw new Error('Preset Plus 第一条必须是 system 条目；请在预览编辑器中调整后再写入')
  if (entries[0].enabled === false) throw new Error('Preset Plus 第一条 system 条目必须启用')
  return { id, name, autoMode: data.autoMode !== false, entries }
}

function dshHome(explicit?: string): string {
  return explicit?.trim() || process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
}

function multiPresetDocument(value: unknown): JsonObject {
  if (!isObject(value)) throw new Error('Preset Plus 存储不是 JSON 对象')
  if (!isObject(value.presets)) throw new Error('Preset Plus 存储缺少 presets 对象')
  return value
}

async function readPresetPlusDocument(path: string): Promise<JsonObject> {
  try {
    return multiPresetDocument(JSON.parse(await readFile(path, 'utf8')))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, activePresetId: '', presets: {} }
    throw new Error(`无法读取 Preset Plus 存储：${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function installPresetPlusPreset(preset: PresetPlusPreset, options: InstallOptions = {}): Promise<JsonObject> {
  const path = join(dshHome(options.dshHome), 'preset-plus.json')
  const doc = await readPresetPlusDocument(path)
  const presets = { ...(doc.presets as JsonObject) }
  const requestedId = presetPlusId(preset.id)
  let id = requestedId
  const conflict = options.conflict ?? 'error'
  if (conflict !== 'error' && conflict !== 'overwrite' && conflict !== 'rename') throw new Error(`未知 Preset Plus 冲突策略：${conflict}`)
  const exists = Object.hasOwn(presets, id)
  if (exists && conflict === 'error') throw new Error(`Preset Plus 预设 ID 已存在：${id}`)
  if (exists && conflict === 'rename') {
    let suffix = 2
    while (Object.hasOwn(presets, `${requestedId}-${suffix}`)) suffix += 1
    id = `${requestedId}-${suffix}`
  }

  const savedPreset = { ...preset, id }
  presets[id] = savedPreset as unknown as JsonValue
  const activePresetId = options.activate === true || typeof doc.activePresetId !== 'string' || !doc.activePresetId
    ? id
    : doc.activePresetId
  const saved: JsonObject = { ...doc, version: 1, activePresetId, presets }
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(saved, null, 2), 'utf8')
  await rename(temporary, path)
  return {
    id,
    name: preset.name,
    path,
    replaced: exists && conflict === 'overwrite',
    renamed: id !== requestedId,
    activated: activePresetId === id,
    presetCount: Object.keys(presets).length,
  }
}
