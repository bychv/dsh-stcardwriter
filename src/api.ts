import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  clearConnectorConfig, describeConnection, exportRemote, importRemote, listRemote, probePath,
  readConnectorConfig, saveConnector, REMOTE_PRESET_CATEGORY_IDS,
} from './connector.js'
import type { RemoteConflictPolicy, RemoteCategoryId } from './connector.js'
import { exportAsset, exportProject, isObject } from './format.js'
import { ProjectStore, resolveWorkspaceDataRoot } from './store.js'
import type { AssetKind, TavernAsset } from './types.js'
import { ModeError } from './authoring-mode.js'
import type { AuthoringModeController } from './authoring-mode.js'

export const API_PREFIX = '/api/dsh-stcardwriter'
const MAX_BODY = 80 * 1024 * 1024

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk)
    size += bytes.length
    if (size > MAX_BODY) throw new HttpError(413, '请求体过大')
    chunks.push(bytes)
  }
  if (chunks.length === 0) return {}
  let parsed: unknown
  try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HttpError(400, 'JSON 格式错误') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, '请求体必须是 JSON 对象')
  return parsed as Record<string, unknown>
}

function json(res: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function file(res: ServerResponse, value: { filename: string; mimeType: string; bytes: Uint8Array }): void {
  const body = Buffer.from(value.bytes)
  const encoded = encodeURIComponent(value.filename)
  res.writeHead(200, {
    'content-type': value.mimeType,
    'content-length': body.length,
    'content-disposition': `attachment; filename*=UTF-8''${encoded}`,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function relativePath(req: IncomingMessage): { parts: string[]; query: URLSearchParams } {
  const origin = `http://${req.headers.host || 'localhost'}`
  const url = new URL(req.url || '/', origin)
  const index = url.pathname.indexOf(API_PREFIX)
  const pathname = index >= 0 ? url.pathname.slice(index + API_PREFIX.length) : url.pathname
  const parts = pathname.split('/').filter(Boolean).map(part => decodeURIComponent(part))
  return { parts, query: url.searchParams }
}

function oneOfKind(value: unknown): AssetKind {
  if (value === 'character' || value === 'worldbook' || value === 'preset') return value
  throw new HttpError(400, 'kind 必须是 character、worldbook 或 preset')
}

function stringArray(value: unknown, label: string, max = 500): string[] {
  if (!Array.isArray(value) || !value.length || !value.every(item => typeof item === 'string' && item.trim())) throw new HttpError(400, `${label} 必须是非空字符串数组`)
  if (value.length > max) throw new HttpError(400, `${label} 最多允许 ${max} 项`)
  return [...new Set(value)]
}

function conflictPolicy(value: unknown): RemoteConflictPolicy {
  if (value === undefined || value === null || value === '') return 'overwrite'
  if (value === 'overwrite' || value === 'rename' || value === 'skip') return value
  throw new HttpError(400, 'conflict 必须是 overwrite、rename 或 skip')
}

function presetTargetCategory(value: unknown): RemoteCategoryId | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'string' && (REMOTE_PRESET_CATEGORY_IDS as readonly string[]).includes(value)) return value as RemoteCategoryId
  throw new HttpError(400, `presetTarget 必须是 ${REMOTE_PRESET_CATEGORY_IDS.join('、')} 之一`)
}

function findAsset(project: { assets: TavernAsset[] }, id: string): TavernAsset {
  const asset = project.assets.find(value => value.id === id)
  if (!asset) throw new HttpError(404, '找不到资源')
  return asset
}

export function workspacePathFromRequest(req: IncomingMessage): string {
  const origin = `http://${req.headers.host || 'localhost'}`
  const url = new URL(req.url || '/', origin)
  const queryPath = url.searchParams.get('workspace')
  if (queryPath) return queryPath
  const raw = Array.isArray(req.headers['x-dsh-workspace']) ? req.headers['x-dsh-workspace'][0] : req.headers['x-dsh-workspace']
  if (!raw) throw new HttpError(400, '缺少当前 DSH 工作区路径')
  try { return decodeURIComponent(raw) } catch { throw new HttpError(400, '工作区路径编码无效') }
}

export function createWorkspaceStoreResolver(): (req: IncomingMessage) => ProjectStore {
  const stores = new Map<string, ProjectStore>()
  return (req) => {
    const root = resolveWorkspaceDataRoot(workspacePathFromRequest(req))
    let store = stores.get(root)
    if (!store) { store = new ProjectStore(root); stores.set(root, store) }
    return store
  }
}

export function createApiHandler(storeOrResolver: ProjectStore | ((req: IncomingMessage) => ProjectStore), modes?: AuthoringModeController) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const method = req.method || 'GET'
      const { parts, query } = relativePath(req)
      if (method === 'OPTIONS') {
        res.writeHead(204, { allow: 'GET, POST, PUT, DELETE, OPTIONS' }); res.end(); return
      }
      if (parts.length === 3 && parts[0] === 'sessions' && parts[2] === 'mode') {
        if (!modes) throw new HttpError(503, '当前宿主未提供会话工具模式切换')
        if (method === 'GET') return json(res, 200, modes.get(parts[1]))
        if (method === 'PUT') {
          const body = await readJson(req)
          return json(res, 200, modes.set(parts[1], body.mode))
        }
        throw new HttpError(405, '不支持的请求')
      }
      const store = typeof storeOrResolver === 'function' ? storeOrResolver(req) : storeOrResolver
      if (parts.length === 1 && parts[0] === 'projects') {
        if (method === 'GET') return json(res, 200, { projects: await store.list() })
        if (method === 'POST') {
          const body = await readJson(req)
          return json(res, 201, { project: await store.create(typeof body.name === 'string' ? body.name : undefined) })
        }
      }
      if (parts[0] === 'connector') {
        if (parts.length === 1 && method === 'GET') {
          const config = await readConnectorConfig(store.root)
          if (!config) return json(res, 200, { connected: false })
          return json(res, 200, { connected: true, config, status: await describeConnection(config.userDataRoot) })
        }
        if (parts.length === 1 && method === 'PUT') {
          const body = await readJson(req)
          if (typeof body.path !== 'string' || !body.path.trim()) throw new HttpError(400, '缺少酒馆目录路径 path')
          const probe = await probePath(body.path)
          if (probe.type === 'unknown') throw new HttpError(400, probe.message)
          const userHandle = typeof body.userHandle === 'string' && body.userHandle.trim() ? body.userHandle.trim() : undefined
          const saved = await saveConnector(store.root, body.path, userHandle)
          return json(res, 200, { connected: true, config: saved.config, status: saved.status })
        }
        if (parts.length === 1 && method === 'DELETE') {
          await clearConnectorConfig(store.root)
          return json(res, 200, { connected: false })
        }
        if (parts.length === 2 && parts[1] === 'probe' && method === 'POST') {
          const body = await readJson(req)
          if (typeof body.path !== 'string' || !body.path.trim()) throw new HttpError(400, '缺少酒馆目录路径 path')
          return json(res, 200, { probe: await probePath(body.path) })
        }
        if (parts.length === 2 && parts[1] === 'remote' && method === 'GET') {
          if (!(await readConnectorConfig(store.root))) throw new HttpError(400, '尚未配置酒馆连接，请先 PUT /connector')
          const kindParam = query.get('kind')
          return json(res, 200, { entries: await listRemote(store.root, kindParam ? oneOfKind(kindParam) : undefined) })
        }
        if (parts.length === 2 && parts[1] === 'import' && method === 'POST') {
          if (!(await readConnectorConfig(store.root))) throw new HttpError(400, '尚未配置酒馆连接，请先 PUT /connector')
          const body = await readJson(req)
          if (typeof body.projectId !== 'string' || !body.projectId.trim()) throw new HttpError(400, '缺少 projectId')
          const files = stringArray(body.files, 'files')
          return json(res, 200, await importRemote(store, body.projectId, files, { replaceExisting: body.replaceExisting !== false }))
        }
        if (parts.length === 2 && parts[1] === 'export' && method === 'POST') {
          if (!(await readConnectorConfig(store.root))) throw new HttpError(400, '尚未配置酒馆连接，请先 PUT /connector')
          const body = await readJson(req)
          if (typeof body.projectId !== 'string' || !body.projectId.trim()) throw new HttpError(400, '缺少 projectId')
          const assetIds = stringArray(body.assetIds, 'assetIds')
          const results = await exportRemote(store, body.projectId, assetIds, { conflict: conflictPolicy(body.conflict), presetTarget: presetTargetCategory(body.presetTarget) })
          return json(res, 200, { results })
        }
      }
      if (parts[0] !== 'projects' || !parts[1]) throw new HttpError(404, '接口不存在')
      const projectId = parts[1]
      if (parts.length === 2) {
        if (method === 'GET') return json(res, 200, { project: await store.get(projectId) })
        if (method === 'PUT') {
          const body = await readJson(req)
          if (typeof body.name !== 'string') throw new HttpError(400, '缺少项目名称')
          return json(res, 200, { project: await store.rename(projectId, body.name) })
        }
        if (method === 'DELETE') { await store.delete(projectId); return json(res, 200, { ok: true }) }
      }
      if (parts.length === 3 && parts[2] === 'import' && method === 'POST') {
        const body = await readJson(req)
        if (!Array.isArray(body.files)) throw new HttpError(400, 'files 必须是数组')
        const files = body.files.map(value => {
          if (!isObject(value) || typeof value.name !== 'string' || typeof value.data !== 'string') throw new HttpError(400, '文件项格式错误')
          return { name: value.name, data: value.data }
        })
        return json(res, 200, await store.importFiles(projectId, files))
      }
      if (parts.length === 3 && parts[2] === 'export' && method === 'GET') return file(res, exportProject(await store.get(projectId)))
      if (parts.length === 3 && parts[2] === 'assets' && method === 'POST') {
        const body = await readJson(req)
        return json(res, 201, { project: await store.addBlankAsset(projectId, oneOfKind(body.kind), typeof body.name === 'string' ? body.name : undefined) })
      }
      if (parts[2] === 'assets' && parts[3]) {
        const assetId = parts[3]
        if (parts.length === 4 && method === 'PUT') {
          const body = await readJson(req)
          if (!isObject(body.asset)) throw new HttpError(400, '缺少 asset')
          return json(res, 200, { project: await store.putAsset(projectId, assetId, body.asset as unknown as TavernAsset) })
        }
        if (parts.length === 4 && method === 'DELETE') return json(res, 200, { project: await store.deleteAsset(projectId, assetId) })
        if (parts.length === 5 && parts[4] === 'export' && method === 'GET') {
          const project = await store.get(projectId)
          return file(res, exportAsset(findAsset(project, assetId), query.get('format') || undefined))
        }
        if (parts.length === 5 && parts[4] === 'migrate' && method === 'POST') {
          const body = await readJson(req)
          if (typeof body.sourceAssetId !== 'string') throw new HttpError(400, '缺少源角色卡 ID')
          const assetIndexes = body.assetIndexes === undefined ? undefined : Array.isArray(body.assetIndexes)
            ? body.assetIndexes.map(value => { if (!Number.isInteger(value) || Number(value) < 0) throw new HttpError(400, 'assetIndexes 格式错误'); return Number(value) })
            : (() => { throw new HttpError(400, 'assetIndexes 必须是数组') })()
          const resourceIds = body.resourceIds === undefined ? undefined : Array.isArray(body.resourceIds)
            ? body.resourceIds.map(value => { if (typeof value !== 'string') throw new HttpError(400, 'resourceIds 格式错误'); return value })
            : (() => { throw new HttpError(400, 'resourceIds 必须是数组') })()
          return json(res, 200, await store.migrateCharacterAssets(projectId, assetId, body.sourceAssetId, { assetIndexes, resourceIds }))
        }
      }
      throw new HttpError(405, '不支持的请求')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const code = error instanceof HttpError || error instanceof ModeError ? error.status : /ENOENT/.test(message) ? 404 : 500
      json(res, code, { error: message })
    }
  }
}
