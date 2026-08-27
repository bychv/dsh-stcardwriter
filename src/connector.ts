import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { characterData, exportAsset, importArchive, safeExportName } from './format.js'
import { ProjectStore } from './store.js'
import type { AssetKind, TavernAsset, TavernProject } from './types.js'

export type RemoteCategoryId = 'characters' | 'worlds' | 'chat-completion' | 'textgen' | 'context' | 'instruct' | 'sysprompt'

export interface RemoteCategory {
  id: RemoteCategoryId
  /** Directory name below the SillyTavern user data root. */
  directory: string
  kind: AssetKind
  extensions: readonly string[]
}

export const REMOTE_CATEGORIES: readonly RemoteCategory[] = [
  { id: 'characters', directory: 'characters', kind: 'character', extensions: ['.png', '.json'] },
  { id: 'worlds', directory: 'worlds', kind: 'worldbook', extensions: ['.json'] },
  { id: 'chat-completion', directory: 'OpenAI Settings', kind: 'preset', extensions: ['.json'] },
  { id: 'textgen', directory: 'TextGen Settings', kind: 'preset', extensions: ['.json'] },
  { id: 'context', directory: 'context', kind: 'preset', extensions: ['.json'] },
  { id: 'instruct', directory: 'instruct', kind: 'preset', extensions: ['.json'] },
  { id: 'sysprompt', directory: 'sysprompt', kind: 'preset', extensions: ['.json'] },
]

export const REMOTE_PRESET_CATEGORY_IDS: readonly RemoteCategoryId[] =
  REMOTE_CATEGORIES.filter(category => category.kind === 'preset').map(category => category.id)

const PRESET_FORMAT_CATEGORY: Record<string, RemoteCategoryId> = {
  'chat-completion-preset': 'chat-completion',
  'textgen-preset': 'textgen',
  'context-preset': 'context',
  'instruct-preset': 'instruct',
  'unknown-preset': 'sysprompt',
}

export interface ConnectorConfig {
  version: 1
  /** The path the user provided: install root or user data root. */
  path: string
  /** Chosen user handle for install-root connections; empty for direct user data roots. */
  userHandle: string
  userDataRoot: string
  savedAt: string
}

export function connectorConfigPath(storeRoot: string): string {
  return join(dirname(resolve(storeRoot)), 'connector.json')
}

export async function readConnectorConfig(storeRoot: string): Promise<ConnectorConfig | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(connectorConfigPath(storeRoot), 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    const config = parsed as Partial<ConnectorConfig>
    if (config.version !== 1 || typeof config.path !== 'string' || typeof config.userDataRoot !== 'string') return undefined
    return {
      version: 1, path: config.path,
      userHandle: typeof config.userHandle === 'string' ? config.userHandle : '',
      userDataRoot: config.userDataRoot,
      savedAt: typeof config.savedAt === 'string' ? config.savedAt : '',
    }
  } catch { return undefined }
}

export async function writeConnectorConfig(storeRoot: string, config: ConnectorConfig): Promise<void> {
  const destination = connectorConfigPath(storeRoot)
  await mkdir(dirname(destination), { recursive: true })
  const temporary = join(dirname(destination), `.connector.${randomUUID()}.tmp`)
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  await rename(temporary, destination)
}

export async function clearConnectorConfig(storeRoot: string): Promise<void> {
  await rm(connectorConfigPath(storeRoot), { force: true })
}

async function requireConfig(storeRoot: string): Promise<ConnectorConfig> {
  const config = await readConnectorConfig(storeRoot)
  if (!config) throw new Error('尚未配置酒馆连接；请先在连接器面板配置酒馆目录，或使用 tavern_connect_configure')
  return config
}

export interface RemoteCategoryStatus {
  id: RemoteCategoryId
  directory: string
  kind: AssetKind
  exists: boolean
  count: number
}

export interface ConnectionStatus {
  userDataRoot: string
  categories: RemoteCategoryStatus[]
}

async function isDirectory(path: string): Promise<boolean> {
  try { return (await stat(path)).isDirectory() } catch { return false }
}

async function fileExists(path: string): Promise<boolean> {
  try { await stat(path); return true } catch { return false }
}

async function readdirFiles(directory: string, extensions: readonly string[]): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && extensions.some(ext => entry.name.toLowerCase().endsWith(ext)))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

export async function describeConnection(userDataRoot: string): Promise<ConnectionStatus> {
  const root = resolve(userDataRoot)
  const categories = await Promise.all(REMOTE_CATEGORIES.map(async category => {
    const directory = join(root, category.directory)
    const exists = await isDirectory(directory)
    return { id: category.id, directory: category.directory, kind: category.kind, exists, count: exists ? (await readdirFiles(directory, category.extensions)).length : 0 }
  }))
  return { userDataRoot: root, categories }
}

export interface ProbeResult {
  path: string
  type: 'user-data-root' | 'install-root' | 'unknown'
  message: string
  userHandles: string[]
  userHandle?: string
  status?: ConnectionStatus
}

export async function probePath(path: string): Promise<ProbeResult> {
  if (typeof path !== 'string' || !path.trim()) {
    return { path: String(path ?? ''), type: 'unknown', message: '请填写酒馆安装根目录或用户数据目录', userHandles: [] }
  }
  const target = resolve(path.trim())
  if (await isDirectory(join(target, 'characters'))) {
    return { path, type: 'user-data-root', message: '识别为酒馆用户数据目录', userHandles: [], userHandle: '', status: await describeConnection(target) }
  }
  const dataBase = await isDirectory(join(target, 'data')) ? join(target, 'data') : target
  const handles: string[] = []
  if (await isDirectory(dataBase)) {
    for (const entry of await readdir(dataBase, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue
      if (await isDirectory(join(dataBase, entry.name, 'characters'))) handles.push(entry.name)
    }
  }
  if (handles.length) {
    const userHandle = handles.includes('default-user') ? 'default-user' : handles[0]!
    return {
      path, type: 'install-root',
      message: dataBase === target ? `识别为酒馆用户目录集合，含 ${handles.length} 个用户` : `识别为酒馆安装根目录，data/ 下有 ${handles.length} 个用户`,
      userHandles: handles, userHandle, status: await describeConnection(join(dataBase, userHandle)),
    }
  }
  return { path, type: 'unknown', message: '目录下没有 characters/，也没有 data/<用户>/characters；请确认路径指向酒馆安装根目录或用户数据目录', userHandles: [] }
}

async function resolveUserDataRoot(path: string, handleOverride?: string): Promise<{ type: ProbeResult['type']; userDataRoot: string; userHandle: string }> {
  const probe = await probePath(path)
  if (probe.type === 'unknown') throw new Error(probe.message)
  if (probe.type === 'user-data-root') return { type: probe.type, userDataRoot: resolve(path.trim()), userHandle: '' }
  const target = resolve(path.trim())
  const dataBase = await isDirectory(join(target, 'data')) ? join(target, 'data') : target
  const userHandle = handleOverride && probe.userHandles.includes(handleOverride) ? handleOverride : probe.userHandle!
  return { type: probe.type, userDataRoot: join(dataBase, userHandle), userHandle }
}

export async function saveConnector(
  storeRoot: string,
  path: string,
  userHandle?: string,
): Promise<{ config: ConnectorConfig; status: ConnectionStatus }> {
  const resolved = await resolveUserDataRoot(path, userHandle?.trim() || undefined)
  const config: ConnectorConfig = {
    version: 1, path: path.trim(), userHandle: resolved.userHandle,
    userDataRoot: resolved.userDataRoot, savedAt: new Date().toISOString(),
  }
  await writeConnectorConfig(storeRoot, config)
  return { config, status: await describeConnection(config.userDataRoot) }
}

export interface RemoteEntry {
  category: RemoteCategoryId
  directory: string
  kind: AssetKind
  name: string
  /** Slash-normalized path relative to the user data root, e.g. "characters/林霁.png". */
  file: string
  bytes: number
  modifiedAt: string
}

export async function listRemote(storeRoot: string, kind?: AssetKind): Promise<RemoteEntry[]> {
  const config = await requireConfig(storeRoot)
  const entries: RemoteEntry[] = []
  for (const category of REMOTE_CATEGORIES) {
    if (kind && category.kind !== kind) continue
    const directory = join(config.userDataRoot, category.directory)
    if (!(await isDirectory(directory))) continue
    for (const filename of await readdirFiles(directory, category.extensions)) {
      const info = await stat(join(directory, filename))
      entries.push({
        category: category.id, directory: category.directory, kind: category.kind,
        name: filename.replace(/\.[^.]+$/, ''), file: `${category.directory}/${filename}`,
        bytes: info.size, modifiedAt: info.mtime.toISOString(),
      })
    }
  }
  return entries.sort((a, b) => a.file.localeCompare(b.file))
}

function safeRemoteFile(userDataRoot: string, file: string): { category: RemoteCategory; file: string; absolute: string } {
  const normalized = file.replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`非法的酒馆文件路径：${file}`)
  const first = normalized.slice(0, normalized.indexOf('/'))
  const category = REMOTE_CATEGORIES.find(value => value.directory.toLowerCase() === first.toLowerCase())
  if (!category) throw new Error(`不支持的酒馆目录：${first}（支持 ${REMOTE_CATEGORIES.map(value => value.directory).join('、')}）`)
  if (!category.extensions.some(ext => normalized.toLowerCase().endsWith(ext))) throw new Error(`不支持的文件类型：${normalized}`)
  const absolute = resolve(userDataRoot, normalized)
  const back = relative(resolve(userDataRoot), absolute)
  if (!back || back.startsWith('..')) throw new Error(`文件路径越出酒馆数据目录：${file}`)
  return { category, file: normalized, absolute }
}

export interface RemoteImportResult {
  project: TavernProject
  imported: number
  replaced: number
  errors: { file: string; error: string }[]
}

const MAX_REMOTE_ITEMS = 500

export async function importRemote(
  store: ProjectStore,
  projectId: string,
  files: string[],
  options: { replaceExisting?: boolean } = {},
): Promise<RemoteImportResult> {
  if (!Array.isArray(files) || !files.length) throw new Error('files 不能为空')
  if (files.length > MAX_REMOTE_ITEMS) throw new Error(`files 最多允许 ${MAX_REMOTE_ITEMS} 项`)
  const config = await requireConfig(store.root)
  const replaceExisting = options.replaceExisting !== false
  const assets: TavernAsset[] = []
  const errors: { file: string; error: string }[] = []
  for (const file of [...new Set(files)]) {
    try {
      const located = safeRemoteFile(config.userDataRoot, file)
      const bytes = await readFile(located.absolute)
      const result = importArchive(located.file, bytes)
      assets.push(...result.assets)
      for (const error of result.errors) errors.push({ file, error: `${error.filename}: ${error.error}` })
    } catch (error) {
      errors.push({ file, error: error instanceof Error ? error.message : String(error) })
    }
  }
  let imported = 0
  let replaced = 0
  const project = await store.update(projectId, value => {
    for (const asset of assets) {
      const index = replaceExisting ? value.assets.findIndex(item => item.source?.filename === asset.source?.filename) : -1
      if (index >= 0) {
        const { id, createdAt } = value.assets[index]!
        value.assets[index] = { ...asset, id, createdAt }
        replaced += 1
      } else {
        value.assets.push(asset)
        imported += 1
      }
    }
  })
  return { project, imported, replaced, errors }
}

export type RemoteConflictPolicy = 'overwrite' | 'rename' | 'skip'

export interface RemoteExportFileResult {
  assetId: string
  name: string
  kind: AssetKind
  category: RemoteCategoryId
  directory: string
  /** Slash-normalized path relative to the user data root. */
  file: string
  status: 'written' | 'overwritten' | 'renamed' | 'skipped'
}

function remoteExportName(asset: TavernAsset): string {
  const data = asset.kind === 'character' ? characterData(asset.data) : asset.data
  return safeExportName(typeof data.name === 'string' && data.name.trim() ? data.name : asset.name)
}

function categoryForAsset(asset: TavernAsset, presetTarget?: string): RemoteCategory {
  if (asset.kind === 'character') return REMOTE_CATEGORIES[0]!
  if (asset.kind === 'worldbook') return REMOTE_CATEGORIES[1]!
  const requested = presetTarget ? REMOTE_CATEGORIES.find(value => value.id === presetTarget && value.kind === 'preset') : undefined
  if (requested) return requested
  return REMOTE_CATEGORIES.find(value => value.id === (PRESET_FORMAT_CATEGORY[asset.format] ?? 'sysprompt'))!
}

export async function exportRemote(
  store: ProjectStore,
  projectId: string,
  assetIds: string[],
  options: { conflict?: RemoteConflictPolicy; presetTarget?: string } = {},
): Promise<RemoteExportFileResult[]> {
  if (!Array.isArray(assetIds) || !assetIds.length) throw new Error('assetIds 不能为空')
  if (assetIds.length > MAX_REMOTE_ITEMS) throw new Error(`assetIds 最多允许 ${MAX_REMOTE_ITEMS} 项`)
  const config = await requireConfig(store.root)
  const conflict = options.conflict ?? 'overwrite'
  const project = await store.get(projectId)
  const userDataRoot = resolve(config.userDataRoot)
  const results: RemoteExportFileResult[] = []
  for (const assetId of [...new Set(assetIds)]) {
    const asset = project.assets.find(value => value.id === assetId)
    if (!asset) throw new Error(`找不到资源：${assetId}`)
    const category = categoryForAsset(asset, options.presetTarget)
    const directory = resolve(userDataRoot, category.directory)
    const back = relative(userDataRoot, directory)
    if (!back || back.startsWith('..')) throw new Error(`目标目录越出酒馆数据目录：${category.directory}`)
    const exported = exportAsset(asset, asset.kind === 'character' ? 'png' : 'json')
    const extension = exported.filename.slice(exported.filename.lastIndexOf('.'))
    const stem = remoteExportName(asset)
    let filename = `${stem}${extension}`
    let status: RemoteExportFileResult['status'] = 'written'
    if (await fileExists(join(directory, filename))) {
      if (conflict === 'skip') {
        results.push({ assetId, name: asset.name, kind: asset.kind, category: category.id, directory: category.directory, file: `${category.directory}/${filename}`, status: 'skipped' })
        continue
      }
      if (conflict === 'rename') {
        let index = 2
        while (await fileExists(join(directory, `${stem} (${index})${extension}`))) index += 1
        filename = `${stem} (${index})${extension}`
        status = 'renamed'
      } else {
        status = 'overwritten'
      }
    }
    await mkdir(directory, { recursive: true })
    const temporary = join(directory, `.${randomUUID()}.tmp`)
    await writeFile(temporary, exported.bytes, { flag: 'wx' })
    await rename(temporary, join(directory, filename))
    results.push({ assetId, name: asset.name, kind: asset.kind, category: category.id, directory: category.directory, file: `${category.directory}/${filename}`, status })
  }
  return results
}
