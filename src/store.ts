import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { createAsset, importArchive, migrateCharacterResources } from './format.js'
import type { AssetKind, BinaryFileReference, InlineBinaryReference, JsonObject, JsonValue, ProjectSummary, TavernAsset, TavernProject } from './types.js'

const SAFE_ID = /^[a-zA-Z0-9-]{1,80}$/

function now(): string { return new Date().toISOString() }
function clone<T>(value: T): T { return structuredClone(value) }
function sha256(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex') }

function binaryDataUri(value: string): { mimeType?: string; bytes: Buffer } | undefined {
  if (!value.startsWith('data:')) return undefined
  const comma = value.indexOf(',')
  if (comma < 0) return undefined
  const metadata = value.slice(5, comma)
  const mimeType = metadata.split(';')[0].toLowerCase() || 'text/plain'
  if (mimeType.startsWith('text/') || /(?:json|javascript|xml|yaml|toml|svg\+xml)$/.test(mimeType)) return undefined
  const encoded = value.slice(comma + 1)
  try {
    return { mimeType, bytes: metadata.toLowerCase().split(';').includes('base64') ? Buffer.from(encoded, 'base64') : Buffer.from(decodeURIComponent(encoded), 'utf8') }
  } catch { return undefined }
}

export function resolveDshHome(): string {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

export function resolveDataRoot(): string {
  return process.env.DSH_STCARDWRITER_DATA || join(resolveDshHome(), 'st-card-writer', 'projects')
}

export function resolveWorkspaceDataRoot(workspacePath: string): string {
  if (!workspacePath || !isAbsolute(workspacePath)) throw new Error('需要有效的 DSH 工作区绝对路径')
  return join(resolve(workspacePath), '.tavernres', 'projects')
}

function assertId(id: string): void {
  if (!SAFE_ID.test(id)) throw new Error('无效 ID')
}

function validateProject(value: unknown): asserts value is TavernProject {
  if (!value || typeof value !== 'object') throw new Error('项目文件损坏')
  const project = value as Partial<TavernProject>
  if (typeof project.id !== 'string' || typeof project.name !== 'string' || !Array.isArray(project.assets)) throw new Error('项目文件损坏')
  assertId(project.id)
}

export class ProjectStore {
  readonly root: string
  private queues = new Map<string, Promise<unknown>>()

  constructor(root = resolveDataRoot()) { this.root = root }

  async initialize(): Promise<void> { await mkdir(this.root, { recursive: true }) }

  private path(id: string): string {
    assertId(id)
    return join(this.root, `${id}.json`)
  }

  private binaryDirectory(id: string): string {
    assertId(id)
    return join(this.root, `${id}.assets`)
  }

  private referencedPath(file: string): string {
    const root = resolve(this.root)
    const destination = resolve(root, file.replaceAll('/', sep))
    const back = relative(root, destination)
    if (!back || back.startsWith('..') || isAbsolute(back)) throw new Error('项目二进制引用越出存储目录')
    return destination
  }

  private async writeBinary(file: string, bytes: Uint8Array): Promise<BinaryFileReference> {
    const destination = this.referencedPath(file)
    await mkdir(dirname(destination), { recursive: true })
    const temporary = `${destination}.${randomUUID()}.tmp`
    await writeFile(temporary, bytes, { flag: 'wx' })
    await rename(temporary, destination)
    return { file: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) }
  }

  private async readBinary(reference: BinaryFileReference): Promise<Buffer> {
    const bytes = await readFile(this.referencedPath(reference.file))
    if (bytes.length !== reference.bytes || sha256(bytes) !== reference.sha256) throw new Error(`项目二进制文件校验失败：${reference.file}`)
    return bytes
  }

  private async prepareForPersistence(project: TavernProject): Promise<TavernProject> {
    const persisted = clone(project)
    for (const asset of persisted.assets) {
      if (asset.source?.pngBase64) {
        const bytes = Buffer.from(asset.source.pngBase64, 'base64')
        asset.source.pngFile = await this.writeBinary(`${project.id}.assets/${asset.id}/source.png`, bytes)
      }
      if (asset.source) delete asset.source.pngBase64
      for (const resource of asset.resources ?? []) {
        if (resource.dataBase64 !== undefined) {
          const bytes = Buffer.from(resource.dataBase64, 'base64')
          const key = createHash('sha256').update(resource.id).digest('hex').slice(0, 32)
          resource.binary = await this.writeBinary(`${project.id}.assets/${asset.id}/resources/${key}.bin`, bytes)
        }
        delete resource.dataBase64
      }
      const references = new Map((asset.inlineBinaries ?? []).map(value => [value.token, value]))
      const retained = new Map<string, InlineBinaryReference>()
      const externalize = async (value: JsonValue, pointer: string): Promise<JsonValue> => {
        if (typeof value === 'string') {
          const existing = references.get(value)
          if (existing) { retained.set(existing.token, existing); return value }
          const inline = binaryDataUri(value)
          if (!inline) return value
          const key = sha256(Buffer.from(pointer, 'utf8')).slice(0, 32)
          const token = `tavernres-binary://${key}`
          const binary = await this.writeBinary(`${project.id}.assets/${asset.id}/inline/${key}.bin`, inline.bytes)
          retained.set(token, { token, mimeType: inline.mimeType, binary })
          return token
        }
        if (Array.isArray(value)) return Promise.all(value.map((item, index) => externalize(item, `${pointer}/${index}`)))
        if (value && typeof value === 'object') {
          const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await externalize(item, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)] as const))
          return Object.fromEntries(entries) as JsonObject
        }
        return value
      }
      asset.data = await externalize(asset.data, '') as JsonObject
      asset.inlineBinaries = retained.size ? [...retained.values()] : undefined
    }
    return persisted
  }

  private async hydrate(project: TavernProject): Promise<TavernProject> {
    for (const asset of project.assets) {
      if (asset.source?.pngFile && asset.source.pngBase64 === undefined) asset.source.pngBase64 = (await this.readBinary(asset.source.pngFile)).toString('base64')
      for (const resource of asset.resources ?? []) {
        if (resource.binary && resource.dataBase64 === undefined) resource.dataBase64 = (await this.readBinary(resource.binary)).toString('base64')
      }
      if (asset.inlineBinaries?.length) {
        const replacements = new Map<string, string>()
        for (const reference of asset.inlineBinaries) {
          const bytes = await this.readBinary(reference.binary)
          replacements.set(reference.token, `data:${reference.mimeType || 'application/octet-stream'};base64,${bytes.toString('base64')}`)
        }
        const restore = (value: JsonValue): JsonValue => {
          if (typeof value === 'string') return replacements.get(value) ?? value
          if (Array.isArray(value)) return value.map(restore)
          if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restore(item)])) as JsonObject
          return value
        }
        asset.data = restore(asset.data) as JsonObject
      }
    }
    return project
  }

  private async persist(project: TavernProject): Promise<void> {
    const persisted = await this.prepareForPersistence(project)
    const destination = this.path(project.id)
    const temporary = join(this.root, `.${project.id}.${randomUUID()}.tmp`)
    await writeFile(temporary, `${JSON.stringify(persisted, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, destination)
  }

  private async serialize<T>(id: string, task: () => Promise<T>): Promise<T> {
    const prior = this.queues.get(id) ?? Promise.resolve()
    const next = prior.catch(() => undefined).then(task)
    this.queues.set(id, next)
    try { return await next } finally { if (this.queues.get(id) === next) this.queues.delete(id) }
  }

  async list(): Promise<ProjectSummary[]> {
    await this.initialize()
    const names = await readdir(this.root)
    const projects = await Promise.all(names.filter(name => SAFE_ID.test(name.replace(/\.json$/, '')) && name.endsWith('.json')).map(async name => {
      try { return await this.get(name.slice(0, -5)) } catch { return undefined }
    }))
    return projects.filter((project): project is TavernProject => Boolean(project)).map(project => ({
      id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt,
      assetCount: project.assets.length,
      counts: {
        character: project.assets.filter(asset => asset.kind === 'character').length,
        worldbook: project.assets.filter(asset => asset.kind === 'worldbook').length,
        preset: project.assets.filter(asset => asset.kind === 'preset').length,
      },
    })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: string): Promise<TavernProject> {
    const value: unknown = JSON.parse(await readFile(this.path(id), 'utf8'))
    validateProject(value)
    return this.hydrate(value)
  }

  async create(name = '未命名酒馆项目'): Promise<TavernProject> {
    const timestamp = now()
    const project: TavernProject = { id: randomUUID(), name: name.trim() || '未命名酒馆项目', createdAt: timestamp, updatedAt: timestamp, assets: [] }
    await this.write(project)
    return clone(project)
  }

  async write(project: TavernProject): Promise<void> {
    validateProject(project)
    await this.initialize()
    await this.serialize(project.id, async () => {
      await this.persist(project)
    })
  }

  async update(id: string, mutator: (project: TavernProject) => void): Promise<TavernProject> {
    return this.serialize(id, async () => {
      const project = await this.get(id)
      mutator(project)
      project.updatedAt = now()
      await this.persist(project)
      return clone(project)
    })
  }

  async rename(id: string, name: string): Promise<TavernProject> {
    return this.update(id, project => { project.name = name.trim() || project.name })
  }

  async delete(id: string): Promise<void> {
    assertId(id)
    await rm(this.path(id), { force: true })
    await rm(this.binaryDirectory(id), { recursive: true, force: true })
  }

  async addBlankAsset(projectId: string, kind: AssetKind, name?: string): Promise<TavernProject> {
    return this.update(projectId, project => { project.assets.push(createAsset(kind, name)) })
  }

  async putAsset(projectId: string, assetId: string, input: TavernAsset): Promise<TavernProject> {
    assertId(assetId)
    return this.update(projectId, project => {
      const index = project.assets.findIndex(asset => asset.id === assetId)
      if (index < 0) throw new Error('找不到条目')
      const createdAt = project.assets[index]!.createdAt
      project.assets[index] = { ...clone(input), id: assetId, createdAt, updatedAt: now() }
    })
  }

  async deleteAsset(projectId: string, assetId: string): Promise<TavernProject> {
    assertId(assetId)
    return this.update(projectId, project => {
      const index = project.assets.findIndex(asset => asset.id === assetId)
      if (index < 0) throw new Error('找不到条目')
      project.assets.splice(index, 1)
    })
  }

  async importFiles(projectId: string, files: { name: string; data: string }[]): Promise<{ project: TavernProject; imported: number; errors: { filename: string; error: string }[] }> {
    const imported: TavernAsset[] = []
    const errors: { filename: string; error: string }[] = []
    for (const file of files) {
      try {
        const result = importArchive(file.name, Buffer.from(file.data, 'base64'))
        imported.push(...result.assets)
        errors.push(...result.errors)
      } catch (error) {
        errors.push({ filename: file.name, error: error instanceof Error ? error.message : String(error) })
      }
    }
    const project = await this.update(projectId, value => { value.assets.push(...imported) })
    return { project, imported: imported.length, errors }
  }

  async migrateCharacterAssets(
    projectId: string,
    targetAssetId: string,
    sourceAssetId: string,
    options: { assetIndexes?: number[]; resourceIds?: string[] } = {},
  ): Promise<{ project: TavernProject; result: { migratedAssets: number; migratedResources: number; renamed: number } }> {
    let result = { migratedAssets: 0, migratedResources: 0, renamed: 0 }
    const project = await this.update(projectId, value => {
      const target = value.assets.find(asset => asset.id === targetAssetId)
      const source = value.assets.find(asset => asset.id === sourceAssetId)
      if (!target || !source) throw new Error('找不到源角色卡或目标角色卡')
      if (target.id === source.id) throw new Error('源角色卡和目标角色卡不能相同')
      result = migrateCharacterResources(target, source, options)
    })
    return { project, result }
  }
}
