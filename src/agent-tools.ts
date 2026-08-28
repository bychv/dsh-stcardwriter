import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  describeConnection, exportRemote, importRemote, listRemote, readConnectorConfig, saveConnector,
  REMOTE_PRESET_CATEGORY_IDS,
} from './connector.js'
import type { RemoteCategoryId, RemoteConflictPolicy } from './connector.js'
import {
  assetForAgent, assetSummaryForAgent, copyWorldbookEntries, createAsset, deleteWorldbookEntry, isObject,
  patchCharacterFields, projectForAgent, projectManifestForAgent, readCharacterTextResource, selectedAssetFieldsForAgent,
  toLosslessJson, upsertWorldbookEntry, worldbookEntryRecords,
} from './format.js'
import { ProjectStore, resolveWorkspaceDataRoot } from './store.js'
import { convertTavernPresetToPresetPlus, installPresetPlusPreset, presetPlusPresetFromAsset } from './preset-plus.js'
import type { AssetKind, JsonObject, TavernAsset, TavernProject } from './types.js'
import type { EntryConflictPolicy } from './format.js'

interface ToolContext { tools: { register(definition: unknown): () => void } }
export const inject = ['tools']

const output = {
  schema: { type: 'object', additionalProperties: true } as const,
  render: (_args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
}

function toolResult(value: unknown): JsonObject {
  const result = toLosslessJson(value)
  if (!isObject(result)) throw new Error('Agent 工具输出必须是 JSON 对象')
  return result
}

function findAsset(project: TavernProject, assetId: string): TavernAsset {
  const asset = project.assets.find(value => value.id === assetId)
  if (!asset) throw new Error('找不到资源')
  return asset
}

function stringList(value: unknown, label: string, maxItems = 200): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) throw new Error(`${label} 必须是字符串数组`)
  if (value.length > maxItems) throw new Error(`${label} 最多允许 ${maxItems} 项`)
  return [...new Set(value)]
}

function projectResult(project: TavernProject, extra: Record<string, unknown> = {}): JsonObject {
  return toolResult({ ...extra, project: projectManifestForAgent(project) })
}

function entryPreview(id: string, entry: JsonObject, previewChars: number): JsonObject {
  const content = typeof entry.content === 'string' ? entry.content : ''
  return toolResult({
    id,
    comment: typeof entry.comment === 'string' ? entry.comment : typeof entry.name === 'string' ? entry.name : '',
    keys: entry.keys ?? entry.key ?? [],
    secondaryKeys: entry.secondary_keys ?? entry.keysecondary ?? [],
    enabled: entry.enabled ?? (entry.disable === true ? false : true),
    contentChars: content.length,
    contentPreview: content.length > previewChars ? `${content.slice(0, previewChars)}…` : content,
  })
}

function kind(value: unknown): AssetKind {
  if (value === 'character' || value === 'worldbook' || value === 'preset') return value
  throw new Error('kind 必须是 character、worldbook 或 preset')
}

function storeFor(workspacePath?: string): ProjectStore {
  return new ProjectStore(resolveWorkspaceDataRoot(workspacePath || process.env.DSH_CWD || process.cwd()))
}

const workspaceParameter = { type: 'string', description: 'DSH 当前工作区绝对路径；酒馆面板发出的任务会自动附带' } as const

export function apply(ctx: ToolContext): void {
  ctx.tools.register(defineTool({
    name: 'tavern_project_list',
    description: '列出酒馆创作模式中的项目及角色卡、世界书、预设数量。',
    parameters: { workspacePath: workspaceParameter }, output,
    isConcurrencySafe: () => true,
    async execute(args: { workspacePath?: string }) { return toolResult({ projects: await storeFor(args.workspacePath).list() }) },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_project_create',
    description: '创建一个空的酒馆创作项目。',
    parameters: { name: { type: 'string', description: '项目名称' }, workspacePath: workspaceParameter }, output,
    async execute(args: { name?: string; workspacePath?: string }) { return projectResult(await storeFor(args.workspacePath).create(args.name)) },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_project_get',
    description: '读取酒馆项目。默认只返回资源目录和字段大小，节省上下文；仅在确实需要一次读取全部原生 JSON 时显式使用 detail=full。二进制 Base64 始终排除。',
    parameters: {
      projectId: { type: 'string', required: true },
      detail: { type: 'string', enum: ['summary', 'full'], description: '默认 summary；full 可能消耗大量 token' },
      workspacePath: workspaceParameter,
    }, output,
    isConcurrencySafe: () => true,
    async execute(args: { projectId: string; detail?: string; workspacePath?: string }) {
      const project = await storeFor(args.workspacePath).get(args.projectId)
      return toolResult({ detail: args.detail === 'full' ? 'full' : 'summary', project: args.detail === 'full' ? projectForAgent(project) : projectManifestForAgent(project) })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_asset_get',
    description: '按需读取一个角色卡、世界书或预设。省略 fields 时仅返回摘要；传字段名数组只读取这些 data 字段；fields=["*"] 才返回完整 data。角色卡同时返回附件清单但不返回 Base64。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true },
      fields: { type: 'json', description: '可选的顶层 data 字段名数组；["*"] 表示完整 data' },
      workspacePath: workspaceParameter,
    }, output,
    isConcurrencySafe: () => true,
    async execute(args: { projectId: string; assetId: string; fields?: unknown; workspacePath?: string }) {
      const project = await storeFor(args.workspacePath).get(args.projectId)
      const asset = findAsset(project, args.assetId)
      const requested = args.fields === undefined ? [] : stringList(args.fields, 'fields', 64)
      const selected = selectedAssetFieldsForAgent(asset, requested)
      const projected = assetForAgent(asset)
      return toolResult({
        asset: assetSummaryForAgent(asset),
        dataRoot: asset.kind === 'character' ? 'data.data（V1 卡可能直接为 data）' : 'data',
        fields: selected.fields,
        missingFields: selected.missing,
        resourceSummary: asset.kind === 'character' ? projected.resourceSummary : undefined,
      })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_asset_create',
    description: '在项目中创建空角色卡、空世界书或空预设。',
    parameters: {
      projectId: { type: 'string', required: true },
      kind: { type: 'string', required: true, enum: ['character', 'worldbook', 'preset'] },
      name: { type: 'string' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; kind: string; name?: string; workspacePath?: string }) {
      const project = await storeFor(args.workspacePath).addBlankAsset(args.projectId, kind(args.kind), args.name)
      return projectResult(project, { asset: assetSummaryForAgent(project.assets.at(-1)!) })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_asset_save',
    description: '保存角色卡、世界书或预设的完整原生 JSON；未知字段会保留。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true },
      name: { type: 'string' },
      data: { type: 'json', required: true, description: 'SillyTavern 原生 JSON 对象' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; assetId: string; name?: string; data: unknown; workspacePath?: string }) {
      if (!isObject(args.data)) throw new Error('data 必须是 JSON 对象')
      const project = await storeFor(args.workspacePath).update(args.projectId, value => {
        const asset = value.assets.find(item => item.id === args.assetId)
        if (!asset) throw new Error('找不到资源')
        asset.data = args.data as JsonObject
        if (args.name?.trim()) asset.name = args.name.trim()
        asset.updatedAt = new Date().toISOString()
      })
      return projectResult(project, { asset: assetSummaryForAgent(findAsset(project, args.assetId)) })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_character_patch',
    description: '只修改角色卡 data 中给出的字段，未提供字段和未知扩展保持不变。character_book 与 assets 必须使用专用工具，避免误覆盖世界书或附件。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true },
      patch: { type: 'json', required: true, description: '要替换的角色卡字段对象，例如 {"description":"...","first_mes":"..."}' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; assetId: string; patch: unknown; workspacePath?: string }) {
      if (!isObject(args.patch)) throw new Error('patch 必须是 JSON 对象')
      let changedFields: string[] = []
      const project = await storeFor(args.workspacePath).update(args.projectId, value => {
        changedFields = patchCharacterFields(findAsset(value, args.assetId), args.patch as JsonObject)
      })
      return projectResult(project, { asset: assetSummaryForAgent(findAsset(project, args.assetId)), changedFields })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_worldbook_entries_list',
    description: '分页列出独立世界书或角色卡内嵌世界书的条目摘要，只返回关键词、启用状态和正文预览。需要完整正文时再调用 tavern_worldbook_entry_get。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true, description: '独立世界书或角色卡 ID' },
      offset: { type: 'number', description: '起始条目下标，默认 0' },
      limit: { type: 'number', description: '返回条目数，默认 20、上限 100' },
      previewChars: { type: 'number', description: '每条正文预览字符数，默认 160、上限 1000' },
      workspacePath: workspaceParameter,
    }, output,
    isConcurrencySafe: () => true,
    async execute(args: { projectId: string; assetId: string; offset?: number; limit?: number; previewChars?: number; workspacePath?: string }) {
      const project = await storeFor(args.workspacePath).get(args.projectId)
      const asset = findAsset(project, args.assetId)
      const records = worldbookEntryRecords(asset)
      const offset = Math.max(0, Math.floor(args.offset ?? 0))
      const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 20)))
      const previewChars = Math.max(0, Math.min(1000, Math.floor(args.previewChars ?? 160)))
      const page = records.slice(offset, offset + limit)
      return toolResult({
        asset: assetSummaryForAgent(asset), total: records.length, offset, limit,
        entries: page.map(value => entryPreview(value.id, value.entry, previewChars)),
        hasMore: offset + page.length < records.length,
        nextOffset: offset + page.length < records.length ? offset + page.length : undefined,
      })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_worldbook_entry_get',
    description: '读取独立世界书或角色卡内嵌世界书中的一个完整原生条目。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true },
      entryId: { type: 'string', required: true },
      workspacePath: workspaceParameter,
    }, output,
    isConcurrencySafe: () => true,
    async execute(args: { projectId: string; assetId: string; entryId: string; workspacePath?: string }) {
      const project = await storeFor(args.workspacePath).get(args.projectId)
      const asset = findAsset(project, args.assetId)
      const record = worldbookEntryRecords(asset).find(value => value.id === args.entryId)
      if (!record) throw new Error('找不到世界书条目')
      return toolResult({ asset: assetSummaryForAgent(asset), entryId: record.id, entry: record.entry })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_worldbook_entry_upsert',
    description: '在独立世界书或角色卡内嵌世界书中新增或覆盖一个原生条目，保持其余条目和未知字段不变。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true, description: '独立世界书或角色卡 ID' },
      uid: { type: 'string', description: '已有条目 ID；省略时自动分配（兼容旧参数名）' },
      entry: { type: 'json', required: true, description: '世界书条目 JSON' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; assetId: string; uid?: string; entry: unknown; workspacePath?: string }) {
      if (!isObject(args.entry)) throw new Error('entry 必须是 JSON 对象')
      let savedUid = ''
      let created = false
      const project = await storeFor(args.workspacePath).update(args.projectId, value => {
        const result = upsertWorldbookEntry(findAsset(value, args.assetId), args.uid, args.entry as JsonObject)
        savedUid = result.entryId
        created = result.created
      })
      return projectResult(project, { asset: assetSummaryForAgent(findAsset(project, args.assetId)), uid: savedUid, created })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_worldbook_entry_delete',
    description: '删除独立世界书或角色卡内嵌世界书中的一个条目；不会改动其他条目。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true },
      entryId: { type: 'string', required: true },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; assetId: string; entryId: string; workspacePath?: string }) {
      let deleted = false
      const project = await storeFor(args.workspacePath).update(args.projectId, value => {
        deleted = deleteWorldbookEntry(findAsset(value, args.assetId), args.entryId)
        if (!deleted) throw new Error('找不到世界书条目')
      })
      return projectResult(project, { asset: assetSummaryForAgent(findAsset(project, args.assetId)), entryId: args.entryId, deleted })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_worldbook_entries_copy',
    description: '在角色卡内嵌世界书和/或独立世界书之间复制指定条目。默认 ID 冲突时重新编号；不会复制角色卡其他字段或附件。',
    parameters: {
      projectId: { type: 'string', required: true },
      sourceAssetId: { type: 'string', required: true },
      targetAssetId: { type: 'string', required: true },
      entryIds: { type: 'json', description: '要复制的条目 ID 字符串数组；省略时复制全部' },
      conflict: { type: 'string', enum: ['renumber', 'overwrite', 'skip'], description: '目标 ID 冲突策略，默认 renumber' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; sourceAssetId: string; targetAssetId: string; entryIds?: unknown; conflict?: string; workspacePath?: string }) {
      if (args.sourceAssetId === args.targetAssetId) throw new Error('源资源和目标资源不能相同')
      const entryIds = args.entryIds === undefined ? undefined : stringList(args.entryIds, 'entryIds', 1000)
      const conflict = (args.conflict ?? 'renumber') as EntryConflictPolicy
      let copyResult: ReturnType<typeof copyWorldbookEntries> | undefined
      const project = await storeFor(args.workspacePath).update(args.projectId, value => {
        copyResult = copyWorldbookEntries(findAsset(value, args.sourceAssetId), findAsset(value, args.targetAssetId), entryIds, conflict)
      })
      const result = copyResult!
      return projectResult(project, {
        source: assetSummaryForAgent(findAsset(project, args.sourceAssetId)),
        target: assetSummaryForAgent(findAsset(project, args.targetAssetId)),
        copied: result.copied, overwritten: result.overwritten, skipped: result.skipped,
        mappingSample: result.mappings.slice(0, 50), mappingsTruncated: result.mappings.length > 50,
      })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_asset_import_json',
    description: '把一份角色卡、世界书或预设 JSON 导入现有项目。',
    parameters: {
      projectId: { type: 'string', required: true },
      filename: { type: 'string', required: true },
      json: { type: 'string', required: true },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; filename: string; json: string; workspacePath?: string }) {
      const data = Buffer.from(args.json, 'utf8').toString('base64')
      const result = await storeFor(args.workspacePath).importFiles(args.projectId, [{ name: args.filename, data }])
      return projectResult(result.project, { imported: result.imported, errors: result.errors })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_preset_convert_to_preset_plus',
    description: '把项目内的 SillyTavern 预设转换成一个新的、尚未写入 Preset Plus 的 preset-plus-preset 项目资源。转换结果可在右侧预览并编辑，也可用 tavern_asset_save 修改；确认后再调用 tavern_preset_plus_write。动态 marker 会跳过并在结果中报告。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true, description: '项目内源酒馆预设资源 ID' },
      presetId: { type: 'string', description: '目标 Preset Plus ID；省略时从预设名称生成' },
      name: { type: 'string', description: '目标显示名称；省略时沿用酒馆预设名称' },
      autoMode: { type: 'boolean', description: '是否自动注入，默认 true' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; assetId: string; presetId?: string; name?: string; autoMode?: boolean; workspacePath?: string }) {
      const store = storeFor(args.workspacePath)
      const sourceProject = await store.get(args.projectId)
      const source = findAsset(sourceProject, args.assetId)
      const conversion = convertTavernPresetToPresetPlus(source, { id: args.presetId, name: args.name, autoMode: args.autoMode })
      const preview = createAsset('preset', conversion.preset.name)
      preview.format = 'preset-plus-preset'
      preview.data = conversion.preset as unknown as JsonObject
      const project = await store.update(args.projectId, value => { value.assets.push(preview) })
      return projectResult(project, {
        source: assetSummaryForAgent(findAsset(project, args.assetId)),
        preview: assetSummaryForAgent(findAsset(project, preview.id)),
        conversion: { sourceFormat: conversion.sourceFormat, converted: conversion.converted, skipped: conversion.skipped, warnings: conversion.warnings },
        next: `检查并修改资源 ${preview.id}，确认后调用 tavern_preset_plus_write`,
      })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_preset_plus_write',
    description: '把项目内已预览和修改完成的 preset-plus-preset 资源写入 Preset Plus。此工具不做酒馆格式转换；源资源必须先由 tavern_preset_convert_to_preset_plus 创建或具有合法的 Preset Plus 单预设结构。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true, description: '待写入的 preset-plus-preset 项目资源 ID' },
      activate: { type: 'boolean', description: '写入后是否立即设为当前激活预设，默认 false' },
      conflict: { type: 'string', enum: ['error', 'overwrite', 'rename'], description: '目标 ID 冲突策略，默认 error' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; assetId: string; activate?: boolean; conflict?: string; workspacePath?: string }) {
      const project = await storeFor(args.workspacePath).get(args.projectId)
      const asset = findAsset(project, args.assetId)
      const preset = presetPlusPresetFromAsset(asset)
      const installed = await installPresetPlusPreset(preset, {
        conflict: (args.conflict ?? 'error') as 'error' | 'overwrite' | 'rename',
        activate: args.activate,
      })
      return toolResult({ installed, source: assetSummaryForAgent(asset) })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_character_assets_migrate',
    description: '把一张角色卡的非世界书附属资产迁移到另一张角色卡。不会复制或覆盖 character_book；遇到同名不同内容的二进制资源会安全重命名。',
    parameters: {
      projectId: { type: 'string', required: true },
      sourceAssetId: { type: 'string', required: true, description: '源角色卡 ID' },
      targetAssetId: { type: 'string', required: true, description: '目标角色卡 ID' },
      assetIndexes: { type: 'json', description: '可选的 data.assets 数组下标列表；省略时迁移全部非世界书资产' },
      resourceIds: { type: 'json', description: '可选的未被 data.assets 引用的附属文件 ID 列表' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; sourceAssetId: string; targetAssetId: string; assetIndexes?: unknown; resourceIds?: unknown; workspacePath?: string }) {
      const assetIndexes = args.assetIndexes === undefined ? undefined : Array.isArray(args.assetIndexes) ? args.assetIndexes.map(Number) : (() => { throw new Error('assetIndexes 必须是数组') })()
      const resourceIds = args.resourceIds === undefined ? undefined : Array.isArray(args.resourceIds) ? args.resourceIds.map(String) : (() => { throw new Error('resourceIds 必须是数组') })()
      const result = await storeFor(args.workspacePath).migrateCharacterAssets(args.projectId, args.targetAssetId, args.sourceAssetId, { assetIndexes, resourceIds })
      return projectResult(result.project, { result: result.result, target: assetSummaryForAgent(findAsset(result.project, args.targetAssetId)) })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_character_resource_read',
    description: '读取角色卡附带的文本附件并返回解码后的文本。支持 CHARX/PNG 内嵌文件和 data: URI，支持 UTF-8/UTF-16；图片、音频等二进制会被拒绝。大附件可用 offset/maxChars 分块读取。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetId: { type: 'string', required: true, description: '角色卡资源 ID' },
      resourceId: { type: 'string', description: 'project_get 附件清单中的 resourceId' },
      path: { type: 'string', description: 'CHARX/PNG 内嵌路径；与 resourceId、assetIndex 三选一' },
      assetIndex: { type: 'number', description: '角色卡 data.assets 数组下标；可读取其内嵌路径或 data: URI' },
      offset: { type: 'number', description: '字符起始位置，默认 0' },
      maxChars: { type: 'number', description: '本次最多返回字符数，默认 50000、上限 100000' },
      workspacePath: workspaceParameter,
    }, output,
    isConcurrencySafe: () => true,
    async execute(args: { projectId: string; assetId: string; resourceId?: string; path?: string; assetIndex?: number; offset?: number; maxChars?: number; workspacePath?: string }) {
      const project = await storeFor(args.workspacePath).get(args.projectId)
      const asset = project.assets.find(value => value.id === args.assetId)
      if (!asset) throw new Error('找不到角色卡')
      const decoded = readCharacterTextResource(asset, { resourceId: args.resourceId, path: args.path, assetIndex: args.assetIndex })
      const offset = Math.max(0, Math.floor(args.offset ?? 0))
      const maxChars = Math.max(1, Math.min(100000, Math.floor(args.maxChars ?? 50000)))
      if (offset > decoded.text.length) throw new Error('offset 超出附件文本长度')
      const end = Math.min(decoded.text.length, offset + maxChars)
      return toolResult({
        resource: { resourceId: decoded.resourceId, path: decoded.path, mimeType: decoded.mimeType, encoding: decoded.encoding, source: decoded.source },
        text: decoded.text.slice(offset, end), offset, totalChars: decoded.text.length,
        truncated: end < decoded.text.length, nextOffset: end < decoded.text.length ? end : undefined,
      })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_connect_status',
    description: '查看酒馆连接器状态：是否已连接本机 SillyTavern、用户数据目录位置，以及角色卡、世界书、五类预设的文件数量。',
    parameters: { workspacePath: workspaceParameter }, output,
    isConcurrencySafe: () => true,
    async execute(args: { workspacePath?: string }) {
      const store = storeFor(args.workspacePath)
      const config = await readConnectorConfig(store.root)
      if (!config) return toolResult({ connected: false, hint: '尚未配置；使用 tavern_connect_configure 传入酒馆目录' })
      return toolResult({ connected: true, config, status: await describeConnection(config.userDataRoot) })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_connect_configure',
    description: '配置酒馆连接器：传入本机酒馆安装根目录或用户数据目录（例如 F:\\SillyTavern 或 F:\\SillyTavern\\data\\default-user）。多用户酒馆可用 userHandle 指定用户，默认 default-user。',
    parameters: {
      path: { type: 'string', required: true, description: '酒馆安装根目录或 data/<用户> 目录的绝对路径' },
      userHandle: { type: 'string', description: '多用户场景的用户目录名；省略时自动选择 default-user' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { path: string; userHandle?: string; workspacePath?: string }) {
      const store = storeFor(args.workspacePath)
      const saved = await saveConnector(store.root, args.path, args.userHandle)
      return toolResult({ connected: true, config: saved.config, status: saved.status })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_remote_list',
    description: '列出酒馆侧的角色卡、世界书和预设文件清单。entries 中的 file 是相对用户数据目录的路径，供 tavern_remote_import 使用。',
    parameters: {
      kind: { type: 'string', enum: ['character', 'worldbook', 'preset'], description: '按资产类型过滤；省略返回全部' },
      offset: { type: 'number', description: '起始下标，默认 0' },
      limit: { type: 'number', description: '返回条数，默认 50、上限 200' },
      workspacePath: workspaceParameter,
    }, output,
    isConcurrencySafe: () => true,
    async execute(args: { kind?: string; offset?: number; limit?: number; workspacePath?: string }) {
      const store = storeFor(args.workspacePath)
      const entries = await listRemote(store.root, args.kind === 'character' || args.kind === 'worldbook' || args.kind === 'preset' ? args.kind : undefined)
      const offset = Math.max(0, Math.floor(args.offset ?? 0))
      const limit = Math.max(1, Math.min(200, Math.floor(args.limit ?? 50)))
      const page = entries.slice(offset, offset + limit)
      return toolResult({
        total: entries.length, offset, limit,
        entries: page.map(entry => ({ category: entry.category, kind: entry.kind, name: entry.name, file: entry.file, bytes: entry.bytes })),
        hasMore: offset + page.length < entries.length,
        nextOffset: offset + page.length < entries.length ? offset + page.length : undefined,
      })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_remote_import',
    description: '把酒馆侧的角色卡、世界书或预设文件导入当前项目。默认同一酒馆文件重复导入时替换项目内既有资源（保留资源 ID），mode=add 则总是新增。',
    parameters: {
      projectId: { type: 'string', required: true },
      files: { type: 'json', required: true, description: 'tavern_remote_list 返回的相对路径数组，如 ["characters/林霁.png","worlds/城镇.json"]' },
      mode: { type: 'string', enum: ['replace', 'add'], description: '同一文件重复导入时替换既有资源还是新增副本，默认 replace' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; files: unknown; mode?: string; workspacePath?: string }) {
      const files = stringList(args.files, 'files', 500)
      const result = await importRemote(storeFor(args.workspacePath), args.projectId, files, { replaceExisting: args.mode !== 'add' })
      return projectResult(result.project, { imported: result.imported, replaced: result.replaced, errors: result.errors })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'tavern_remote_export',
    description: '把项目资源写入酒馆：角色卡导出为 PNG 到 characters/，世界书到 worlds/，预设按格式到 OpenAI Settings、TextGen Settings、context、instruct 或 sysprompt。导出后在酒馆界面刷新即可看到。',
    parameters: {
      projectId: { type: 'string', required: true },
      assetIds: { type: 'json', required: true, description: '要导出的资源 ID 数组' },
      conflict: { type: 'string', enum: ['overwrite', 'rename', 'skip'], description: '酒馆侧同名文件冲突策略，默认 overwrite' },
      presetTarget: { type: 'string', enum: [...REMOTE_PRESET_CATEGORY_IDS], description: '预设目标目录；默认按格式自动判断，无法判断时写入 sysprompt' },
      workspacePath: workspaceParameter,
    }, output,
    async execute(args: { projectId: string; assetIds: unknown; conflict?: string; presetTarget?: string; workspacePath?: string }) {
      const assetIds = stringList(args.assetIds, 'assetIds', 500)
      const conflict = (args.conflict ?? 'overwrite') as RemoteConflictPolicy
      const presetTarget = args.presetTarget && (REMOTE_PRESET_CATEGORY_IDS as readonly string[]).includes(args.presetTarget) ? args.presetTarget as RemoteCategoryId : undefined
      const results = await exportRemote(storeFor(args.workspacePath), args.projectId, assetIds, { conflict, presetTarget })
      return toolResult({
        results,
        written: results.filter(value => value.status !== 'skipped').length,
        skipped: results.filter(value => value.status === 'skipped').length,
      })
    },
  }))
}

export { createAsset }
