import { createHash, randomUUID } from 'node:crypto'
import { strFromU8, unzipSync, zipSync } from 'fflate'
import { makePlaceholderPng, readCharacterFromPng, readExtendedAssetsFromPng, writeCharacterToPng } from './png.js'
import type { AttachedResource, AssetFormat, AssetKind, ExportedFile, JsonObject, JsonValue, TavernAsset, TavernProject } from './types.js'

const REQUIRED_CHARACTER_FIELDS = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example'] as const

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Materialize a value that satisfies DSH's lossless-JSON boundary.
 * Optional object properties are omitted, while sparse/undefined array slots
 * become null so the returned graph can be serialized without changing shape.
 */
export function toLosslessJson(value: unknown): JsonValue {
  const active = new WeakSet<object>()

  const visit = (current: unknown, path: string): JsonValue | undefined => {
    if (current === undefined) return undefined
    if (current === null || typeof current === 'string' || typeof current === 'boolean') return current
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw new Error(`工具输出 ${path} 含有非有限数字`)
      return Object.is(current, -0) ? 0 : current
    }
    if (typeof current !== 'object') throw new Error(`工具输出 ${path} 含有无法 JSON 化的 ${typeof current}`)
    if (active.has(current)) throw new Error(`工具输出 ${path} 含有循环引用`)

    active.add(current)
    try {
      if (Array.isArray(current)) {
        const output: JsonValue[] = []
        for (let index = 0; index < current.length; index += 1) {
          output.push(visit(current[index], `${path}[${index}]`) ?? null)
        }
        return output
      }

      const prototype = Object.getPrototypeOf(current)
      if (prototype !== Object.prototype && prototype !== null) throw new Error(`工具输出 ${path} 不是普通 JSON 对象`)
      const output: JsonObject = {}
      for (const [key, item] of Object.entries(current)) {
        const next = visit(item, `${path}.${key}`)
        if (next !== undefined) output[key] = next
      }
      return output
    } finally {
      active.delete(current)
    }
  }

  const result = visit(value, '$')
  if (result === undefined) throw new Error('工具输出根值不能是 undefined')
  return result
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function stringValue(value: JsonValue | undefined, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function characterData(card: JsonObject): JsonObject {
  return isObject(card.data) ? card.data : card
}

export function characterVersion(card: JsonObject): AssetFormat {
  if (card.spec === 'chara_card_v3' || String(card.spec_version ?? '').startsWith('3')) return 'character-v3'
  if (card.spec === 'chara_card_v2' || String(card.spec_version ?? '').startsWith('2')) return 'character-v2'
  return 'character-v1'
}

function completeCharacterData(source: JsonObject): JsonObject {
  const data = clone(source)
  for (const field of REQUIRED_CHARACTER_FIELDS) if (typeof data[field] !== 'string') data[field] = ''
  if (!Array.isArray(data.alternate_greetings)) data.alternate_greetings = []
  if (!Array.isArray(data.tags)) data.tags = []
  if (!Array.isArray(data.group_only_greetings)) data.group_only_greetings = []
  if (!isObject(data.extensions)) data.extensions = {}
  if (typeof data.creator !== 'string') data.creator = ''
  if (typeof data.character_version !== 'string') data.character_version = ''
  if (typeof data.creator_notes !== 'string') data.creator_notes = ''
  if (typeof data.system_prompt !== 'string') data.system_prompt = ''
  if (typeof data.post_history_instructions !== 'string') data.post_history_instructions = ''
  return data
}

export function toCharacterV2(card: JsonObject): JsonObject {
  return {
    ...clone(card),
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: completeCharacterData(characterData(card)),
  }
}

export function toCharacterV3(card: JsonObject): JsonObject {
  return {
    ...clone(card),
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: completeCharacterData(characterData(card)),
  }
}

export function toCharacterV1(card: JsonObject): JsonObject {
  const data = characterData(card)
  return Object.fromEntries(REQUIRED_CHARACTER_FIELDS.map(field => [field, stringValue(data[field])])) as JsonObject
}

export function createBlankData(kind: AssetKind): { format: AssetFormat; data: JsonObject } {
  if (kind === 'character') {
    return {
      format: 'character-v3',
      data: toCharacterV3({
        name: '未命名角色', description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
        creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [],
        group_only_greetings: [], tags: [], creator: '', character_version: '1.0', extensions: {},
      }),
    }
  }
  if (kind === 'worldbook') return { format: 'worldbook', data: { entries: {} } }
  return {
    format: 'chat-completion-preset',
    data: {
      name: '未命名预设', temperature: 1, top_p: 1, frequency_penalty: 0, presence_penalty: 0,
      prompts: [
        { name: 'Main Prompt', system_prompt: true, role: 'system', content: '', identifier: 'main' },
        { identifier: 'worldInfoBefore', name: 'World Info (before)', system_prompt: true, marker: true },
        { identifier: 'charDescription', name: 'Char Description', system_prompt: true, marker: true },
        { identifier: 'worldInfoAfter', name: 'World Info (after)', system_prompt: true, marker: true },
        { identifier: 'chatHistory', name: 'Chat History', system_prompt: true, marker: true },
      ],
      prompt_order: [{ character_id: 100001, order: [
        { identifier: 'main', enabled: true }, { identifier: 'worldInfoBefore', enabled: true },
        { identifier: 'charDescription', enabled: true }, { identifier: 'worldInfoAfter', enabled: true },
        { identifier: 'chatHistory', enabled: true },
      ] }],
    },
  }
}

function detectPresetFormat(data: JsonObject): AssetFormat {
  if (Array.isArray(data.prompts) || Array.isArray(data.prompt_order)) return 'chat-completion-preset'
  if (typeof data.story_string === 'string') return 'context-preset'
  if (typeof data.input_sequence === 'string' || typeof data.output_sequence === 'string') return 'instruct-preset'
  if ('temperature' in data || 'top_p' in data || 'rep_pen' in data) return 'textgen-preset'
  return 'unknown-preset'
}

export function detectKind(data: JsonObject): { kind: AssetKind; format: AssetFormat } {
  const inner = characterData(data)
  const hasCharacterFields = REQUIRED_CHARACTER_FIELDS.filter(field => typeof inner[field] === 'string').length >= 3
  if (data.spec === 'chara_card_v2' || data.spec === 'chara_card_v3' || hasCharacterFields) {
    return { kind: 'character', format: characterVersion(data) }
  }
  if (isObject(data.entries) || Array.isArray(data.entries)) return { kind: 'worldbook', format: 'worldbook' }
  return { kind: 'preset', format: detectPresetFormat(data) }
}

function assetName(data: JsonObject, fallback: string, kind: AssetKind): string {
  if (kind === 'character') return stringValue(characterData(data).name, fallback)
  return stringValue(data.name, fallback)
}

function baseName(filename: string): string {
  const leaf = filename.replaceAll('\\', '/').split('/').at(-1) || '未命名'
  return leaf.replace(/\.(json|png|charx)$/i, '') || '未命名'
}

export function normalizeResourcePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\/+/, '').split('/').filter(part => part && part !== '.' && part !== '..').join('/')
}

function resourceMimeType(filename: string): string | undefined {
  const ext = filename.split('.').at(-1)?.toLowerCase()
  return ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4', webm: 'video/webm', json: 'application/json',
    txt: 'text/plain', css: 'text/css', js: 'text/javascript', html: 'text/html', glb: 'model/gltf-binary', gltf: 'model/gltf+json' } as Record<string, string>)[ext || '']
}

function makeResource(path: string, container: AttachedResource['container'], bytes: Uint8Array): AttachedResource {
  const normalized = normalizeResourcePath(path)
  return { id: randomUUID(), path: normalized, container, mimeType: resourceMimeType(normalized), dataBase64: Buffer.from(bytes).toString('base64') }
}

function attachedBytes(resource: AttachedResource): Buffer {
  if (typeof resource.dataBase64 !== 'string') throw new Error(`附属资源尚未加载：${resource.path}`)
  return Buffer.from(resource.dataBase64, 'base64')
}

export function createAsset(kind: AssetKind, name?: string): TavernAsset {
  const now = new Date().toISOString()
  const blank = createBlankData(kind)
  if (name) {
    if (kind === 'character') characterData(blank.data).name = name
    else blank.data.name = name
  }
  return {
    id: randomUUID(), kind, format: blank.format, name: name ?? assetName(blank.data, '未命名', kind),
    data: blank.data, createdAt: now, updatedAt: now,
  }
}

function parseJsonBytes(bytes: Uint8Array): JsonObject {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, ''))
  if (!isObject(value)) throw new Error('顶层必须是 JSON 对象')
  return value
}

export function importAsset(filename: string, bytes: Uint8Array): TavernAsset {
  let data: JsonObject
  let pngBase64: string | undefined
  let container: 'json' | 'png' | 'charx' = 'json'
  let resources: AttachedResource[] = []
  if (/\.png$/i.test(filename)) {
    const parsed = readCharacterFromPng(bytes)
    if (!isObject(parsed)) throw new Error('PNG 角色卡元数据不是 JSON 对象')
    data = parsed
    pngBase64 = Buffer.from(bytes).toString('base64')
    container = 'png'
    resources = readExtendedAssetsFromPng(bytes).map(value => makeResource(value.path, 'png', value.bytes))
  } else if (/\.charx$/i.test(filename)) {
    const files = unzipSync(bytes)
    const cardEntry = Object.entries(files).find(([name]) => name.replaceAll('\\', '/').toLowerCase() === 'card.json')
    if (!cardEntry) throw new Error('CHARX 缺少根目录 card.json')
    data = parseJsonBytes(cardEntry[1])
    container = 'charx'
    resources = Object.entries(files)
      .filter(([name]) => name.replaceAll('\\', '/').toLowerCase() !== 'card.json' && !name.endsWith('/'))
      .map(([name, value]) => makeResource(name, 'charx', value))
  } else {
    data = parseJsonBytes(bytes)
  }
  const detected = detectKind(data)
  const now = new Date().toISOString()
  return {
    id: randomUUID(), ...detected, name: assetName(data, baseName(filename), detected.kind), data,
    source: { filename, mimeType: /\.png$/i.test(filename) ? 'image/png' : /\.charx$/i.test(filename) ? 'application/zip' : 'application/json', pngBase64, container },
    resources: resources.length ? resources : undefined,
    createdAt: now, updatedAt: now,
  }
}

export function importArchive(filename: string, bytes: Uint8Array): { assets: TavernAsset[]; errors: { filename: string; error: string }[] } {
  if (!/\.zip$/i.test(filename) || /\.charx$/i.test(filename)) return { assets: [importAsset(filename, bytes)], errors: [] }
  const files = unzipSync(bytes)
  const assets: TavernAsset[] = []
  const errors: { filename: string; error: string }[] = []
  for (const [entryName, entryBytes] of Object.entries(files)) {
    if (!/\.(json|png|charx)$/i.test(entryName)) continue
    try { assets.push(importAsset(entryName, entryBytes)) } catch (error) {
      errors.push({ filename: entryName, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return { assets, errors }
}

function safeExportName(name: string): string {
  const safe = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().replace(/[. ]+$/g, '')
  return safe || 'untitled'
}

function jsonFile(filename: string, data: JsonObject): ExportedFile {
  return { filename, mimeType: 'application/json; charset=utf-8', bytes: Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8') }
}

function convertEmbeddedUris(card: JsonObject, container: 'png' | 'charx'): JsonObject {
  const result = toCharacterV3(card)
  const data = characterData(result)
  if (!Array.isArray(data.assets)) return result
  data.assets = data.assets.map(value => {
    if (!isObject(value) || typeof value.uri !== 'string') return value
    const next = clone(value)
    const uri = value.uri
    if (container === 'charx' && uri.startsWith('__asset:')) next.uri = `embeded://${normalizeResourcePath(uri.slice('__asset:'.length))}`
    if (container === 'png' && /^(?:embeded|embedded):\/\//i.test(uri)) next.uri = `__asset:${normalizeResourcePath(uri.replace(/^(?:embeded|embedded):\/\//i, ''))}`
    return next
  })
  return result
}

export function exportAsset(asset: TavernAsset, requested?: string): ExportedFile {
  const stem = safeExportName(asset.name)
  if (asset.kind === 'character') {
    if (requested === 'v1') return jsonFile(`${stem}.v1.json`, toCharacterV1(asset.data))
    if (requested === 'v2') return jsonFile(`${stem}.v2.json`, toCharacterV2(asset.data))
    if (requested === 'json' || requested === 'v3') return jsonFile(`${stem}.json`, toCharacterV3(asset.data))
    if (requested === 'charx') {
      const card = Buffer.from(`${JSON.stringify(convertEmbeddedUris(asset.data, 'charx'), null, 2)}\n`, 'utf8')
      const files: Record<string, Uint8Array> = { 'card.json': card }
      for (const resource of asset.resources ?? []) {
        const path = normalizeResourcePath(resource.path)
        if (path && path.toLowerCase() !== 'card.json') files[path] = attachedBytes(resource)
      }
      return { filename: `${stem}.charx`, mimeType: 'application/zip', bytes: zipSync(files, { level: 9 }) }
    }
    const original = asset.source?.pngBase64 ? Buffer.from(asset.source.pngBase64, 'base64') : makePlaceholderPng()
    return {
      filename: `${stem}.png`, mimeType: 'image/png',
      bytes: writeCharacterToPng(original, toCharacterV2(asset.data), convertEmbeddedUris(asset.data, 'png'),
        (asset.resources ?? []).map(resource => ({ path: normalizeResourcePath(resource.path), bytes: attachedBytes(resource) }))),
    }
  }
  return jsonFile(`${stem}.json`, asset.data)
}

export function exportProject(project: TavernProject): ExportedFile {
  const used = new Map<string, number>()
  const files: Record<string, Uint8Array> = {}
  for (const asset of project.assets) {
    const characterFormat = asset.source?.container === 'charx' ? 'charx' : 'png'
    const exported = exportAsset(asset, asset.kind === 'character' ? characterFormat : 'json')
    const folder = asset.kind === 'character' ? 'characters' : asset.kind === 'worldbook' ? 'worldbooks' : 'presets'
    let filename = `${folder}/${exported.filename}`
    const count = used.get(filename) ?? 0
    used.set(filename, count + 1)
    if (count > 0) filename = filename.replace(/(\.[^.]+)$/, `-${count + 1}$1`)
    files[filename] = exported.bytes
  }
  files['project.json'] = Buffer.from(JSON.stringify({ name: project.name, exportedAt: new Date().toISOString() }, null, 2))
  return { filename: `${safeExportName(project.name)}.zip`, mimeType: 'application/zip', bytes: zipSync(files, { level: 6 }) }
}

export function embeddedPath(uri: string): string | undefined {
  if (uri.startsWith('__asset:')) return normalizeResourcePath(uri.slice('__asset:'.length))
  if (/^(?:embeded|embedded):\/\//i.test(uri)) return normalizeResourcePath(uri.replace(/^(?:embeded|embedded):\/\//i, ''))
  return undefined
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'jsonl', 'yaml', 'yml', 'xml', 'html', 'htm', 'css', 'js', 'mjs', 'cjs',
  'ts', 'tsx', 'jsx', 'csv', 'tsv', 'ini', 'toml', 'cfg', 'conf', 'log', 'prompt', 'py', 'lua', 'sql', 'svg',
])

function declaredText(path: string, mimeType?: string): boolean {
  const mime = (mimeType || '').toLowerCase().split(';')[0]
  if (mime.startsWith('text/') || /\b(?:json|javascript|xml|yaml|toml|svg\+xml)$/.test(mime)) return true
  return TEXT_EXTENSIONS.has(path.split('.').at(-1)?.toLowerCase() || '')
}

function decodeTextBytes(bytes: Uint8Array, path: string, mimeType?: string): { text: string; encoding: string } {
  const input = Buffer.from(bytes)
  let text: string
  let encoding: string
  if (input[0] === 0xff && input[1] === 0xfe) {
    text = new TextDecoder('utf-16le', { fatal: true }).decode(input.subarray(2)); encoding = 'utf-16le'
  } else if (input[0] === 0xfe && input[1] === 0xff) {
    text = new TextDecoder('utf-16be', { fatal: true }).decode(input.subarray(2)); encoding = 'utf-16be'
  } else {
    const start = input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf ? 3 : 0
    text = new TextDecoder('utf-8', { fatal: true }).decode(input.subarray(start)); encoding = 'utf-8'
  }
  if (!declaredText(path, mimeType)) {
    const controls = [...text].filter(value => {
      const code = value.charCodeAt(0)
      return code < 32 && code !== 9 && code !== 10 && code !== 13
    }).length
    if (text.includes('\0') || controls > Math.max(2, text.length * 0.01)) throw new Error('所选附件不是可安全读取的文本格式')
  }
  return { text, encoding }
}

function parseDataUri(uri: string): { mimeType?: string; bytes: Buffer } | undefined {
  if (!uri.startsWith('data:')) return undefined
  const comma = uri.indexOf(',')
  if (comma < 0) throw new Error('附件 data URI 格式错误')
  const metadata = uri.slice(5, comma)
  const mimeType = metadata.split(';')[0] || undefined
  const encoded = uri.slice(comma + 1)
  try {
    return { mimeType, bytes: metadata.split(';').includes('base64') ? Buffer.from(encoded, 'base64') : Buffer.from(decodeURIComponent(encoded), 'utf8') }
  } catch { throw new Error('附件 data URI 无法解码') }
}

export interface DecodedCharacterTextResource {
  resourceId: string
  path: string
  mimeType?: string
  encoding: string
  text: string
  source: 'embedded' | 'data-uri'
}

export function readCharacterTextResource(
  asset: TavernAsset,
  selector: { resourceId?: string; path?: string; assetIndex?: number },
): DecodedCharacterTextResource {
  if (asset.kind !== 'character') throw new Error('只能读取角色卡附带的文本资源')
  if (selector.assetIndex !== undefined) {
    const assets = Array.isArray(characterData(asset.data).assets) ? characterData(asset.data).assets as JsonValue[] : []
    const item = assets[selector.assetIndex]
    if (!isObject(item) || typeof item.uri !== 'string') throw new Error('data.assets 下标无效或该项没有 URI')
    const inline = parseDataUri(item.uri)
    if (inline) {
      const path = `${stringValue(item.name, `asset-${selector.assetIndex}`)}.${stringValue(item.ext, 'txt')}`
      const decoded = decodeTextBytes(inline.bytes, path, inline.mimeType)
      return { resourceId: `asset:${selector.assetIndex}`, path, mimeType: inline.mimeType, ...decoded, source: 'data-uri' }
    }
    const path = embeddedPath(item.uri)
    if (!path) throw new Error('该资产是远程或默认 URI，没有可读取的内嵌文本')
    selector = { path }
  }
  const resource = selector.resourceId
    ? asset.resources?.find(value => value.id === selector.resourceId)
    : selector.path ? asset.resources?.find(value => normalizeResourcePath(value.path).toLowerCase() === normalizeResourcePath(selector.path!).toLowerCase()) : undefined
  if (!resource) throw new Error('找不到角色卡附带资源；请提供 resourceId、path 或 assetIndex')
  const bytes = attachedBytes(resource)
  let decoded: { text: string; encoding: string }
  try { decoded = decodeTextBytes(bytes, resource.path, resource.mimeType) } catch (error) {
    if (!declaredText(resource.path, resource.mimeType)) throw new Error('所选附件不是可安全读取的文本格式')
    throw new Error(`文本附件解码失败：${error instanceof Error ? error.message : String(error)}`)
  }
  return { resourceId: resource.id, path: resource.path, mimeType: resource.mimeType, ...decoded, source: 'embedded' }
}

export function canReadCharacterTextResource(resource: AttachedResource): boolean {
  try { decodeTextBytes(attachedBytes(resource), resource.path, resource.mimeType); return true } catch { return false }
}

function replaceEmbeddedPath(uri: string, path: string): string {
  return uri.startsWith('__asset:') ? `__asset:${path}` : `embeded://${path}`
}

function renamedPath(path: string, used: Set<string>): string {
  const dot = path.lastIndexOf('.')
  const stem = dot > path.lastIndexOf('/') ? path.slice(0, dot) : path
  const ext = dot > path.lastIndexOf('/') ? path.slice(dot) : ''
  for (let index = 2; ; index += 1) {
    const candidate = `${stem}-copy-${index}${ext}`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
}

export interface CharacterResourceSummary {
  hasEmbeddedWorldbook: boolean
  assets: { index: number; type: string; name: string; uri: string; ext: string; path?: string; backingPresent: boolean }[]
  resources: { resourceId: string; path: string; mimeType?: string; referenced: boolean; bytes: number; textReadable: boolean }[]
}

function valueShape(value: JsonValue): JsonObject {
  if (typeof value === 'string') return { type: 'string', chars: value.length }
  if (Array.isArray(value)) return { type: 'array', items: value.length }
  if (value && typeof value === 'object') return { type: 'object', keys: Object.keys(value).length }
  return { type: value === null ? 'null' : typeof value }
}

export function worldbookEntryRecords(asset: TavernAsset): { id: string; entry: JsonObject; index?: number }[] {
  const book = asset.kind === 'character'
    ? (isObject(characterData(asset.data).character_book) ? characterData(asset.data).character_book as JsonObject : undefined)
    : asset.kind === 'worldbook' ? asset.data : undefined
  if (!book || (!isObject(book.entries) && !Array.isArray(book.entries))) return []
  if (Array.isArray(book.entries)) {
    return book.entries.flatMap((entry, index) => isObject(entry)
      ? [{ id: String(entry.id ?? entry.uid ?? index), entry, index }]
      : [])
  }
  return Object.entries(book.entries).flatMap(([id, entry]) => isObject(entry) ? [{ id, entry }] : [])
}

function mutableWorldbook(asset: TavernAsset): JsonObject {
  if (asset.kind === 'worldbook') {
    if (!isObject(asset.data.entries) && !Array.isArray(asset.data.entries)) asset.data.entries = {}
    return asset.data
  }
  if (asset.kind !== 'character') throw new Error('所选资源不是角色卡或世界书')
  const data = characterData(asset.data)
  if (!isObject(data.character_book)) data.character_book = { name: `${asset.name} 世界书`, entries: [] }
  const book = data.character_book as JsonObject
  if (!isObject(book.entries) && !Array.isArray(book.entries)) book.entries = []
  return book
}

function nextEntryId(records: { id: string }[]): string {
  const numeric = records.map(value => Number(value.id)).filter(value => Number.isSafeInteger(value) && value >= 0)
  return String((numeric.length ? Math.max(...numeric) : -1) + 1)
}

function setEntryIdentity(entry: JsonObject, id: string, arrayContainer: boolean): void {
  const numeric = Number(id)
  const value: JsonValue = Number.isSafeInteger(numeric) && String(numeric) === id ? numeric : id
  if ('uid' in entry) entry.uid = value
  if (arrayContainer && ('id' in entry || !('uid' in entry))) entry.id = value
}

export function upsertWorldbookEntry(asset: TavernAsset, requestedId: string | undefined, input: JsonObject): { entryId: string; created: boolean } {
  const book = mutableWorldbook(asset)
  const records = worldbookEntryRecords(asset)
  const entryId = requestedId || nextEntryId(records)
  const existing = records.find(value => value.id === entryId)
  const entry = clone(input)
  if (Array.isArray(book.entries)) {
    setEntryIdentity(entry, entryId, true)
    if (existing?.index !== undefined) book.entries[existing.index] = entry
    else book.entries.push(entry)
  } else {
    setEntryIdentity(entry, entryId, false)
    ;(book.entries as JsonObject)[entryId] = entry
  }
  asset.updatedAt = new Date().toISOString()
  return { entryId, created: !existing }
}

export function deleteWorldbookEntry(asset: TavernAsset, entryId: string): boolean {
  const book = mutableWorldbook(asset)
  const existing = worldbookEntryRecords(asset).find(value => value.id === entryId)
  if (!existing) return false
  if (Array.isArray(book.entries)) book.entries.splice(existing.index!, 1)
  else delete (book.entries as JsonObject)[entryId]
  asset.updatedAt = new Date().toISOString()
  return true
}

export type EntryConflictPolicy = 'renumber' | 'overwrite' | 'skip'

export function copyWorldbookEntries(
  source: TavernAsset,
  target: TavernAsset,
  entryIds?: string[],
  conflict: EntryConflictPolicy = 'renumber',
): { copied: number; overwritten: number; skipped: number; mappings: { sourceId: string; targetId: string; status: string }[] } {
  if (!['character', 'worldbook'].includes(source.kind) || !['character', 'worldbook'].includes(target.kind)) throw new Error('条目只能在角色卡内嵌世界书或独立世界书之间复制')
  const requested = entryIds ? new Set(entryIds) : undefined
  const sourceRecords = worldbookEntryRecords(source).filter(value => !requested || requested.has(value.id))
  if (requested) {
    const missing = [...requested].filter(id => !sourceRecords.some(value => value.id === id))
    if (missing.length) throw new Error(`源世界书找不到条目：${missing.join(', ')}`)
  }
  let copied = 0
  let overwritten = 0
  let skipped = 0
  const mappings: { sourceId: string; targetId: string; status: string }[] = []
  for (const sourceRecord of sourceRecords) {
    const exists = worldbookEntryRecords(target).some(value => value.id === sourceRecord.id)
    if (exists && conflict === 'skip') {
      skipped += 1
      mappings.push({ sourceId: sourceRecord.id, targetId: sourceRecord.id, status: 'skipped' })
      continue
    }
    const targetId = exists && conflict === 'renumber' ? undefined : sourceRecord.id
    const result = upsertWorldbookEntry(target, targetId, sourceRecord.entry)
    if (exists && conflict === 'overwrite') overwritten += 1
    else copied += 1
    mappings.push({ sourceId: sourceRecord.id, targetId: result.entryId, status: exists && conflict === 'overwrite' ? 'overwritten' : 'copied' })
  }
  return { copied, overwritten, skipped, mappings }
}

export function patchCharacterFields(asset: TavernAsset, patch: JsonObject): string[] {
  if (asset.kind !== 'character') throw new Error('所选资源不是角色卡')
  const forbidden = Object.keys(patch).filter(key => key === 'character_book' || key === 'assets')
  if (forbidden.length) throw new Error(`${forbidden.join(', ')} 请使用专用世界书或附属资源工具编辑`)
  const data = characterData(asset.data)
  for (const [key, value] of Object.entries(patch)) data[key] = clone(value)
  if (typeof patch.name === 'string' && patch.name.trim()) asset.name = patch.name.trim()
  asset.updatedAt = new Date().toISOString()
  return Object.keys(patch)
}

export function assetSummaryForAgent(asset: TavernAsset): JsonObject {
  const data = asset.kind === 'character' ? characterData(asset.data) : asset.data
  const summary: JsonObject = {
    id: asset.id,
    kind: asset.kind,
    format: asset.format,
    name: asset.name,
    updatedAt: asset.updatedAt,
    fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, valueShape(value)])),
  }
  if (asset.kind === 'character') {
    summary.hasEmbeddedWorldbook = isObject(data.character_book)
    summary.worldbookEntryCount = worldbookEntryRecords(asset).length
    summary.attachmentCount = asset.resources?.length ?? 0
    summary.declaredAssetCount = Array.isArray(data.assets) ? data.assets.length : 0
  } else if (asset.kind === 'worldbook') {
    summary.entryCount = worldbookEntryRecords(asset).length
  } else {
    summary.promptCount = Array.isArray(data.prompts) ? data.prompts.length : 0
  }
  return toLosslessJson(summary) as JsonObject
}

export function projectManifestForAgent(project: TavernProject): JsonObject {
  return toLosslessJson({
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    assetCount: project.assets.length,
    assets: project.assets.map(assetSummaryForAgent),
  }) as JsonObject
}

export function characterResourceSummary(asset: TavernAsset): CharacterResourceSummary {
  const data = characterData(asset.data)
  const rawAssets = Array.isArray(data.assets) ? data.assets : []
  const resources = asset.resources ?? []
  const objectAssets: { value: JsonObject; index: number }[] = []
  rawAssets.forEach((value, index) => { if (isObject(value)) objectAssets.push({ value, index }) })
  const assets = objectAssets
    .filter(item => !['lorebook', 'worldbook'].includes(String(item.value.type ?? '').toLowerCase()))
    .map(({ value, index }) => {
      const uri = stringValue(value.uri)
      const path = embeddedPath(uri)
      return { index, type: stringValue(value.type, 'other'), name: stringValue(value.name, `资源 ${index + 1}`), uri,
        ext: stringValue(value.ext), path, backingPresent: path ? resources.some(resource => normalizeResourcePath(resource.path).toLowerCase() === path.toLowerCase()) : true }
    })
  const referenced = new Set(assets.map(value => value.path?.toLowerCase()).filter((value): value is string => Boolean(value)))
  return {
    hasEmbeddedWorldbook: isObject(data.character_book), assets,
    resources: resources.map(resource => ({ resourceId: resource.id, path: resource.path, mimeType: resource.mimeType,
      referenced: referenced.has(normalizeResourcePath(resource.path).toLowerCase()), bytes: resource.binary?.bytes ?? attachedBytes(resource).length,
      textReadable: canReadCharacterTextResource(resource) })),
  }
}

export function migrateCharacterResources(
  target: TavernAsset,
  source: TavernAsset,
  options: { assetIndexes?: number[]; resourceIds?: string[] } = {},
): { migratedAssets: number; migratedResources: number; renamed: number } {
  if (source.kind !== 'character' || target.kind !== 'character') throw new Error('附属资源只能在角色卡之间迁移')
  const sourceData = characterData(source.data)
  const targetData = characterData(target.data)
  const sourceAssets = Array.isArray(sourceData.assets) ? sourceData.assets : []
  if (!Array.isArray(targetData.assets)) targetData.assets = []
  const targetAssets = targetData.assets as JsonValue[]
  if (!target.resources) target.resources = []
  const selectedIndexes = new Set(options.assetIndexes ?? sourceAssets.map((_, index) => index))
  const selectedResourceIds = new Set(options.resourceIds ?? [])
  const used = new Set(target.resources.map(resource => normalizeResourcePath(resource.path).toLowerCase()))
  let migratedAssets = 0
  let migratedResources = 0
  let renamed = 0

  const copyBacking = (path: string): string => {
    const sourceResource = source.resources?.find(resource => normalizeResourcePath(resource.path).toLowerCase() === path.toLowerCase())
    if (!sourceResource) return path
    const same = target.resources!.find(resource => normalizeResourcePath(resource.path).toLowerCase() === path.toLowerCase())
    if (same && same.binary?.sha256 && same.binary.sha256 === sourceResource.binary?.sha256) return path
    if (same && same.dataBase64 !== undefined && same.dataBase64 === sourceResource.dataBase64) return path
    let destination = path
    if (same || used.has(path.toLowerCase())) { destination = renamedPath(path, used); renamed += 1 }
    target.resources!.push({ ...clone(sourceResource), id: randomUUID(), path: destination })
    used.add(destination.toLowerCase())
    migratedResources += 1
    return destination
  }

  for (let index = 0; index < sourceAssets.length; index += 1) {
    const value = sourceAssets[index]
    if (!selectedIndexes.has(index) || !isObject(value)) continue
    if (['lorebook', 'worldbook'].includes(String(value.type ?? '').toLowerCase())) continue
    const next = clone(value)
    if (typeof next.uri === 'string') {
      const path = embeddedPath(next.uri)
      if (path) next.uri = replaceEmbeddedPath(next.uri, copyBacking(path))
    }
    const duplicate = targetAssets.some(item => isObject(item) && item.type === next.type && item.name === next.name && item.uri === next.uri)
    if (!duplicate) { targetAssets.push(next); migratedAssets += 1 }
  }
  for (const resource of source.resources ?? []) {
    if (!selectedResourceIds.has(resource.id)) continue
    copyBacking(normalizeResourcePath(resource.path))
  }
  target.updatedAt = new Date().toISOString()
  return { migratedAssets, migratedResources, renamed }
}

/** Lossless-JSON Agent projection of one asset, never including raw binary Base64. */
export function assetForAgent(asset: TavernAsset): JsonObject {
  const source = asset.source ? { ...asset.source, pngBase64: undefined } : undefined
  const tokens = new Set((asset.inlineBinaries ?? []).map(value => value.token))
  const sanitize = (value: unknown, pointer = ''): unknown => {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const comma = value.indexOf(',')
      const metadata = comma < 0 ? '' : value.slice(5, comma)
      const mime = metadata.split(';')[0].toLowerCase() || 'text/plain'
      const textual = mime.startsWith('text/') || /(?:json|javascript|xml|yaml|toml|svg\+xml)$/.test(mime)
      if (!textual) {
        const token = `tavernres-binary://${createHash('sha256').update(pointer).digest('hex').slice(0, 32)}`
        return tokens.has(token) ? token : `[不可文本化的 ${mime} Data URI 已排除]`
      }
      return value
    }
    if (Array.isArray(value)) return value.map((item, index) => sanitize(item, `${pointer}/${index}`))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)]))
    return value
  }
  const data = sanitize(asset.data)
  if (asset.kind !== 'character') return toLosslessJson({ ...asset, source, data }) as JsonObject
  const summary = characterResourceSummary(asset)
  const safeSummary = {
    ...summary,
    assets: summary.assets.map(item => ({ ...item, uri: item.uri.startsWith('data:') ? '[Data URI 内容已排除；使用 assetIndex 按需读取文本附件]' : item.uri })),
  }
  return toLosslessJson({ ...asset, source, data, resources: safeSummary.resources, resourceSummary: safeSummary }) as JsonObject
}

export function selectedAssetFieldsForAgent(asset: TavernAsset, requestedFields: string[]): { fields: JsonObject; missing: string[] } {
  const projected = assetForAgent(asset)
  const projectedData = isObject(projected.data) ? projected.data : {}
  const root = asset.kind === 'character' && isObject(projectedData.data) ? projectedData.data : projectedData
  if (requestedFields.includes('*')) return { fields: root, missing: [] }
  const fields: JsonObject = {}
  const missing: string[] = []
  for (const field of requestedFields) {
    if (Object.hasOwn(root, field)) fields[field] = root[field]!
    else missing.push(field)
  }
  return { fields, missing }
}

/** Lossless-JSON Agent projection: parsed authoring data plus binary references, never raw binary Base64. */
export function projectForAgent(project: TavernProject): JsonObject {
  const view = { ...project, assets: project.assets.map(assetForAgent) }
  return toLosslessJson(view) as JsonObject
}

export function orderedPresetPrompts(data: JsonObject): JsonObject[] {
  const prompts = Array.isArray(data.prompts) ? data.prompts.filter(isObject) : []
  const byId = new Map(prompts.map(prompt => [String(prompt.identifier ?? ''), prompt]))
  const groups = Array.isArray(data.prompt_order) ? data.prompt_order.filter(isObject) : []
  const preferred = groups.find(group => group.character_id === 100001) ?? groups[0]
  if (!preferred || !Array.isArray(preferred.order)) return prompts
  return preferred.order.filter(isObject).filter(item => item.enabled !== false).map(item => byId.get(String(item.identifier ?? ''))).filter(isObject)
}

export function decodeUtf8(bytes: Uint8Array): string {
  return strFromU8(bytes)
}
