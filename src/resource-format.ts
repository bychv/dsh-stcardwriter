import type { JsonObject, JsonValue, TavernAsset } from './types.js'

// Browser-safe shared codec. Do not import the Node/PNG implementation here.
export type BookDialect = 'worldbook' | 'character'
export interface FormatIssue { path: string; code: string; severity: 'error' | 'warning'; message: string; fixable: boolean }
export interface FormatReport { valid: boolean; repairable: boolean; errorCount: number; warningCount: number; issues: FormatIssue[]; changes: string[] }
const object = (v: unknown): v is JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v)
const own = (v: JsonObject, key: string): boolean => Object.hasOwn(v, key)
const pathKey = (path: string, key: string): string => `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
const integerId = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0

export const WORLD_ENTRY_DEFAULTS: JsonObject = {
  key: [], keysecondary: [], comment: '', content: '', constant: false, vectorized: false,
  selective: true, selectiveLogic: 0, addMemo: true, order: 100, position: 0, disable: false,
  ignoreBudget: false, excludeRecursion: false, preventRecursion: false,
  matchPersonaDescription: false, matchCharacterDescription: false, matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false, matchScenario: false, matchCreatorNotes: false,
  delayUntilRecursion: false, probability: 100, useProbability: true, depth: 4, outletName: '',
  group: '', groupOverride: false, groupWeight: 100, scanDepth: null, caseSensitive: null,
  matchWholeWords: null, useGroupScoring: null, automationId: '', role: null,
  sticky: 0, cooldown: 0, delay: 0, triggers: [], displayIndex: 0,
  characterFilter: { isExclude: false, names: [], tags: [] },
}
const EXTENSIONS: Record<string, string> = {
  position: 'position', excludeRecursion: 'exclude_recursion', preventRecursion: 'prevent_recursion',
  displayIndex: 'display_index', probability: 'probability', useProbability: 'useProbability', depth: 'depth',
  selectiveLogic: 'selectiveLogic', outletName: 'outlet_name', group: 'group', groupOverride: 'group_override',
  groupWeight: 'group_weight', delayUntilRecursion: 'delay_until_recursion', scanDepth: 'scan_depth',
  matchWholeWords: 'match_whole_words', useGroupScoring: 'use_group_scoring', caseSensitive: 'case_sensitive',
  automationId: 'automation_id', role: 'role', vectorized: 'vectorized', sticky: 'sticky', cooldown: 'cooldown',
  delay: 'delay', matchPersonaDescription: 'match_persona_description', matchCharacterDescription: 'match_character_description',
  matchCharacterPersonality: 'match_character_personality', matchCharacterDepthPrompt: 'match_character_depth_prompt',
  matchScenario: 'match_scenario', matchCreatorNotes: 'match_creator_notes', triggers: 'triggers', ignoreBudget: 'ignore_budget',
}
const CORE: Record<string, string> = { uid: 'id', key: 'keys', keysecondary: 'secondary_keys', order: 'insertion_order', characterFilter: 'character_filter' }

class Check {
  issues: FormatIssue[] = []
  changes: string[] = []
  issue(path: string, code: string, message: string, fixable = false, severity: FormatIssue['severity'] = 'error'): void {
    this.issues.push({ path, code, message, fixable, severity })
  }
  set(obj: JsonObject, key: string, value: JsonValue, path: string): void {
    if (!own(obj, key) || !equal(obj[key], value)) { obj[key] = structuredClone(value); this.changes.push(pathKey(path, key)) }
  }
  field(obj: JsonObject, key: string, fallback: JsonValue, path: string, required = false, nullable = false): void {
    const at = pathKey(path, key)
    if (!own(obj, key)) {
      if (required) this.issue(at, 'missing', '缺少必填字段，可补默认值', true)
      this.set(obj, key, fallback, path)
      return
    }
    const v = obj[key]
    if (v === null && nullable) return
    let next: JsonValue = v
    if (typeof fallback === 'boolean') {
      if (v === 'true' || v === 1) next = true
      if (v === 'false' || v === 0) next = false
    } else if (typeof fallback === 'number' && typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) next = Number(v)
    else if (Array.isArray(fallback) && typeof v === 'string') next = v ? [v] : []
    const valid = Array.isArray(fallback) ? Array.isArray(next) && next.every(item => typeof item === 'string')
      : object(fallback) ? object(next) : typeof next === typeof fallback && (typeof next !== 'number' || Number.isFinite(next))
    if (!valid) { this.issue(at, 'type', '字段类型错误；不能安全转换，需手动修正'); return }
    if (!equal(v, next)) { this.issue(at, 'type', '可无歧义转换字段类型', true); this.set(obj, key, next, path) }
  }
  report(): FormatReport {
    const errorCount = this.issues.filter(v => v.severity === 'error').length
    return { valid: errorCount === 0, repairable: !this.issues.some(v => v.severity === 'error' && !v.fixable), errorCount,
      warningCount: this.issues.length - errorCount, issues: this.issues, changes: [...new Set(this.changes)] }
  }
}

function dialect(entry: JsonObject): BookDialect {
  return own(entry, 'keys') || own(entry, 'enabled') || own(entry, 'insertion_order') || typeof entry.position === 'string' ? 'character' : 'worldbook'
}

function translate(entry: JsonObject, target: BookDialect, source: BookDialect, c: Check, path: string): void {
  if (source === target) return
  const ext = object(entry.extensions) ? entry.extensions : {}
  const move = (from: string, to: string): void => { if (own(entry, from)) { entry[to] = entry[from]; delete entry[from] } }
  if (target === 'character') {
    for (const [native, embedded] of Object.entries(CORE)) move(native, embedded)
    if (own(entry, 'disable')) {
      c.field(entry, 'disable', false, path)
      if (typeof entry.disable === 'boolean') { entry.enabled = !entry.disable; delete entry.disable }
    }
    for (const [native, embedded] of Object.entries(EXTENSIONS)) {
      if (own(entry, native)) { ext[embedded] = entry[native]; if (native !== 'position') delete entry[native] }
    }
    if (typeof entry.position === 'number') entry.position = entry.position === 0 ? 'before_char' : 'after_char'
    // ST's default supports /regex/ keys; preserve an explicitly supplied use_regex.
    if (!own(entry, 'use_regex')) entry.use_regex = true
    if (!own(entry, 'extensions') || object(entry.extensions)) entry.extensions = ext
  } else {
    for (const [native, embedded] of Object.entries(CORE)) move(embedded, native)
    if (own(entry, 'enabled')) {
      c.field(entry, 'enabled', true, path)
      if (typeof entry.enabled === 'boolean') { entry.disable = !entry.enabled; delete entry.enabled }
    }
    const position = entry.position
    for (const [native, embedded] of Object.entries(EXTENSIONS)) if (own(ext, embedded)) entry[native] = structuredClone(ext[embedded])
    if (!own(ext, 'position')) entry.position = position === 'before_char' ? 0 : position === 'after_char' ? 1 : position ?? 0
    if (!own(entry, 'caseSensitive') && typeof entry.case_sensitive === 'boolean') entry.caseSensitive = entry.case_sensitive
  }
  c.changes.push(path)
}

function normalizeEntry(input: JsonObject, target: BookDialect, id: JsonValue, c: Check, path: string, source = dialect(input)): JsonObject {
  const entry = structuredClone(input)
  if (own(entry, 'extensions') && !object(entry.extensions)) c.issue(pathKey(path, 'extensions'), 'type', 'extensions 必须是对象，不能丢弃已有扩展')
  translate(entry, target, source, c, path)
  const idKey = target === 'character' ? 'id' : 'uid'
  c.set(entry, idKey, id, path)
  c.field(entry, idKey, 0, path, true)
  if (!integerId(entry[idKey])) c.issue(pathKey(path, idKey), 'id', '条目 ID 必须是非负安全整数')
  if (target === 'worldbook') {
    for (const [key, value] of Object.entries(WORLD_ENTRY_DEFAULTS)) nativeField(entry, key, key === 'displayIndex' && integerId(id) ? id : value, c, path)
  } else {
    for (const key of ['keys', 'secondary_keys']) c.field(entry, key, [], path, key === 'keys')
    c.field(entry, 'content', '', path, true)
    c.field(entry, 'enabled', true, path, true)
    c.field(entry, 'insertion_order', 100, path, true)
    c.field(entry, 'extensions', {}, path, true)
    c.field(entry, 'use_regex', true, path)
    c.field(entry, 'comment', '', path)
    c.field(entry, 'constant', false, path)
    c.field(entry, 'selective', false, path)
    if (!own(entry, 'position')) c.set(entry, 'position', 'before_char', path)
    if (!['before_char', 'after_char'].includes(String(entry.position))) c.issue(pathKey(path, 'position'), 'position', '卡内 position 应为 before_char 或 after_char；高级位置存入 extensions.position')
    if (object(entry.extensions)) {
      for (const [native, embedded] of Object.entries(EXTENSIONS)) {
        const fallback = native === 'position' ? (entry.position === 'before_char' ? 0 : 1)
          : native === 'caseSensitive' && typeof entry.case_sensitive === 'boolean' ? entry.case_sensitive
          : native === 'displayIndex' && integerId(id) ? id : WORLD_ENTRY_DEFAULTS[native]
        nativeField(entry.extensions, native, fallback, c, pathKey(path, 'extensions'), embedded)
      }
    }
    if (own(entry, 'case_sensitive')) c.field(entry, 'case_sensitive', false, path)
    if (own(entry, 'name')) c.field(entry, 'name', '', path)
    if (own(entry, 'priority')) c.field(entry, 'priority', 0, path)
  }
  return entry
}

function nativeField(entry: JsonObject, native: string, fallback: JsonValue, c: Check, path: string, key = native): void {
  if (native === 'delayUntilRecursion' && integerId(entry[key])) return
  const nullableBool = ['caseSensitive', 'matchWholeWords', 'useGroupScoring'].includes(native)
  const nullableNumber = ['scanDepth', 'role', 'sticky', 'cooldown', 'delay'].includes(native)
  if (fallback === null && !own(entry, key)) c.set(entry, key, null, path)
  const effective = fallback === null ? (nullableBool ? false : 0) : fallback
  c.field(entry, key, effective, path, ['key', 'content', 'order', 'disable'].includes(native), nullableBool || nullableNumber)
  const v = entry[key]
  if (typeof v === 'number') {
    if (native === 'position' && (!Number.isInteger(v) || v < 0 || v > 7)) c.issue(pathKey(path, key), 'range', '酒馆插入位置必须为 0–7 的整数')
    if (native === 'selectiveLogic' && ![0, 1, 2, 3].includes(v)) c.issue(pathKey(path, key), 'range', '关键词逻辑必须为 0–3')
    if (native === 'probability' && (v < 0 || v > 100)) c.issue(pathKey(path, key), 'range', '概率必须在 0–100 之间')
    if (native === 'role' && ![0, 1, 2].includes(v)) c.issue(pathKey(path, key), 'range', '角色必须为 null 或 0/1/2')
    if (['depth', 'scanDepth', 'sticky', 'cooldown', 'delay'].includes(native) && (!Number.isInteger(v) || v < 0)) c.issue(pathKey(path, key), 'range', '深度/计时值必须为非负整数或允许的 null')
  }
  if (native === 'characterFilter' && object(v)) {
    c.field(v, 'isExclude', false, pathKey(path, key))
    c.field(v, 'names', [], pathKey(path, key))
    c.field(v, 'tags', [], pathKey(path, key))
  }
}

function normalizeBook(input: JsonObject, target: BookDialect, c: Check, path: string, source?: BookDialect): JsonObject {
  const book = structuredClone(input)
  if (target === 'character') {
    if (!own(book, 'extensions')) c.issue(pathKey(path, 'extensions'), 'spec-default', 'CC 规范要求书级 extensions；酒馆样本可省略，导出补空对象', true, 'warning')
    c.field(book, 'extensions', {}, path)
    for (const key of ['name', 'description']) if (own(book, key)) c.field(book, key, '', path)
    for (const key of ['scan_depth', 'token_budget']) if (own(book, key)) c.field(book, key, 0, path)
    if (own(book, 'recursive_scanning')) c.field(book, 'recursive_scanning', false, path)
  }
  if (!own(book, 'entries')) { c.issue(pathKey(path, 'entries'), 'missing', '缺少 entries，可创建空条目集合', true); c.set(book, 'entries', target === 'character' ? [] : {}, path) }
  const entries = book.entries
  if (!Array.isArray(entries) && !object(entries)) { c.issue(pathKey(path, 'entries'), 'container', 'entries 必须为数组或对象，不能丢弃现有值'); return book }
  const array = Array.isArray(entries)
  if (array !== (target === 'character')) c.issue(pathKey(path, 'entries'), 'container', target === 'character' ? '随卡世界书 entries 必须是数组' : '独立世界书 entries 必须是 UID 对象', true)
  const output: JsonObject = {}
  const list: JsonValue[] = []
  const used = new Set<string>()
  for (const [key, raw] of Object.entries(entries)) {
    const at = pathKey(pathKey(path, 'entries'), key)
    if (!object(raw)) { c.issue(at, 'entry', '条目必须为对象，不能丢弃该条目'); list.push(raw); output[key] = raw; continue }
    // Old editor versions produced a native object with stale CC aliases.
    // Prefer native fields in that specific container; otherwise detect aliases.
    const from = source ?? (!array && ['key', 'order', 'disable'].some(field => own(raw, field)) ? 'worldbook' : dialect(raw))
    const identity = array ? (raw.id ?? raw.uid ?? Number(key)) : (/^(0|[1-9]\d*)$/.test(key) ? Number(key) : key)
    const id = typeof identity === 'string' && /^(0|[1-9]\d*)$/.test(identity) ? Number(identity) : identity
    if (used.has(String(id))) c.issue(at, 'duplicate-id', '重复条目 ID，需要明确分配新 ID，不能覆盖其他条目')
    used.add(String(id))
    const normalized = normalizeEntry(raw, target, id, c, at, from)
    if (!equal(raw, normalized)) c.changes.push(at)
    list.push(normalized)
    output[String(id)] = normalized
  }
  if (array !== (target === 'character')) c.changes.push(pathKey(path, 'entries'))
  book.entries = target === 'character' ? list : output
  return book
}

const BASE_FIELDS = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example']
const V2_FIELDS = ['creator_notes', 'system_prompt', 'post_history_instructions', 'creator', 'character_version']

export function normalizeAssetFormat(asset: Pick<TavernAsset, 'kind' | 'data'>): { data: JsonObject; report: FormatReport } {
  const c = new Check()
  if (!object(asset.data)) {
    c.issue('', 'root', '资源 data 顶层必须是 JSON 对象；不会丢弃原值')
    return { data: asset.data, report: c.report() }
  }
  let card = structuredClone(asset.data)
  if (asset.kind === 'worldbook') card = normalizeBook(card, 'worldbook', c, '')
  else if (asset.kind === 'character') {
    const wrapped = own(card, 'spec') || own(card, 'spec_version') || object(card.data)
    if (wrapped && !object(card.data)) { c.issue('/data', 'container', 'V2/V3 角色卡需要 data 对象；不能猜测或丢弃卡面数据'); return { data: card, report: c.report() } }
    const data = wrapped ? card.data as JsonObject : card
    const root = wrapped ? '/data' : ''
    let version = 1
    if (wrapped) {
      if (card.spec === 'chara_card_v3') version = 3
      else if (card.spec === 'chara_card_v2') version = 2
      else if (card.spec === undefined && ['2.0', '3.0'].includes(String(card.spec_version))) {
        version = card.spec_version === '3.0' ? 3 : 2
        c.issue('/spec', 'spec', '可根据 spec_version 补充 spec', true)
        c.set(card, 'spec', `chara_card_v${version}`, '')
      } else c.issue('/spec', 'spec', '未知或缺失角色卡 spec，需明确选择 V2/V3')
      if (version > 1 && card.spec_version !== `${version}.0`) {
        const future = typeof card.spec_version === 'string' && Number(card.spec_version) > version
        c.issue('/spec_version', 'version', future ? '较新的规范版本，不自动降级' : 'spec_version 与 spec 不一致', !future, future ? 'warning' : 'error')
        if (!future) c.set(card, 'spec_version', `${version}.0`, '')
      }
    }
    for (const key of BASE_FIELDS) c.field(data, key, '', root, true)
    if (version > 1) {
      for (const key of V2_FIELDS) c.field(data, key, '', root, true)
      for (const key of ['alternate_greetings', 'tags']) c.field(data, key, [], root, true)
      c.field(data, 'extensions', {}, root, true)
      if (version === 3) {
        if (!own(data, 'group_only_greetings')) c.issue('/data/group_only_greetings', 'spec-default', 'V3 规范字段，酒馆可省略；导出补空数组', true, 'warning')
        c.field(data, 'group_only_greetings', [], root)
      }
    } else {
      // V1 cards can carry optional V2 fields; don't let later conversion erase
      // a malformed extension or greeting list just because the card is flat.
      for (const key of V2_FIELDS) if (own(data, key)) c.field(data, key, '', root)
      for (const key of ['alternate_greetings', 'group_only_greetings', 'tags']) if (own(data, key)) c.field(data, key, [], root)
      if (own(data, 'extensions')) c.field(data, 'extensions', {}, root)
    }
    if (own(data, 'character_book')) {
      if (!object(data.character_book)) c.issue(pathKey(root, 'character_book'), 'container', 'character_book 必须为对象；不会自动删除世界书')
      else data.character_book = normalizeBook(data.character_book, 'character', c, pathKey(root, 'character_book'))
    }
    for (const key of ['nickname']) if (own(data, key)) c.field(data, key, '', root)
    if (own(data, 'source')) c.field(data, 'source', [], root)
    if (own(data, 'creator_notes_multilingual')) {
      c.field(data, 'creator_notes_multilingual', {}, root)
      if (object(data.creator_notes_multilingual)) for (const key of Object.keys(data.creator_notes_multilingual)) c.field(data.creator_notes_multilingual, key, '', `${root}/creator_notes_multilingual`)
    }
    for (const key of ['creation_date', 'modification_date']) if (own(data, key)) c.field(data, key, 0, root)
    if (own(data, 'assets')) {
      if (!Array.isArray(data.assets)) c.issue(pathKey(root, 'assets'), 'assets', 'assets 必须为数组；不会删改附件')
      else data.assets.forEach((item, index) => {
        const at = `${root}/assets/${index}`
        if (!object(item)) c.issue(at, 'asset', '附件描述必须为对象')
        else for (const key of ['type', 'uri', 'name', 'ext']) if (typeof item[key] !== 'string') c.issue(pathKey(at, key), 'asset', '附件字段必须为字符串；需人工补充，不猜测 URI')
      })
    }
    // SillyTavern JSON exports may carry V1 mirror fields. Keep them in sync,
    // but never invent these optional legacy fields on a pure CCv2/CCv3 card.
    if (wrapped) for (const key of [...BASE_FIELDS, 'tags']) if (own(card, key) && own(data, key) && !equal(card[key], data[key])) {
      c.issue(pathKey('', key), 'legacy-mirror', '旧版镜像与 data 不同，以 data 为准同步', true, 'warning')
      c.set(card, key, data[key], '')
    }
    if (wrapped && own(card, 'creatorcomment') && typeof data.creator_notes === 'string' && card.creatorcomment !== data.creator_notes) {
      c.issue('/creatorcomment', 'legacy-mirror', '旧版创作者备注与 data.creator_notes 不同，以 data 为准同步', true, 'warning')
      c.set(card, 'creatorcomment', data.creator_notes, '')
    }
  } else c.issue('', 'unsupported', '此检查器仅支持角色卡和世界书，不验证预设')
  return { data: card, report: c.report() }
}

export function checkAssetFormat(asset: Pick<TavernAsset, 'kind' | 'data'>): FormatReport { return normalizeAssetFormat(asset).report }

export function repairedAssetData(asset: Pick<TavernAsset, 'kind' | 'data'>): JsonObject {
  const result = normalizeAssetFormat(asset)
  const after = checkAssetFormat({ kind: asset.kind, data: result.data })
  if (!result.report.repairable || !after.valid) {
    const issues = result.report.issues.filter(v => v.severity === 'error' && !v.fixable)
    throw new Error(`格式检查未通过：${(issues.length ? issues : after.issues).slice(0, 5).map(v => `${v.path || '/'} ${v.message}`).join('；')}。请用 tavern_asset_validate / tavern_asset_repair 检查修复`)
  }
  return result.data
}

export function convertWorldbook(input: JsonObject, target: BookDialect, source?: BookDialect): JsonObject {
  const c = new Check()
  const book = normalizeBook(input, target, c, '', source)
  if (!c.report().repairable) throw new Error(c.issues.filter(v => !v.fixable && v.severity === 'error').map(v => `${v.path} ${v.message}`).slice(0, 5).join('；'))
  return book
}

export function convertWorldbookEntry(input: JsonObject, target: BookDialect, id: string, source?: BookDialect): JsonObject {
  const c = new Check()
  const numeric = /^(0|[1-9]\d*)$/.test(id) ? Number(id) : id
  const entry = normalizeEntry(input, target, numeric, c, '', source)
  if (!c.report().repairable) throw new Error(c.issues.filter(v => !v.fixable && v.severity === 'error').map(v => `${v.path} ${v.message}`).slice(0, 5).join('；'))
  return entry
}
