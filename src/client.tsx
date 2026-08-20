import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { AssetKind, TavernAsset, TavernProject } from './types.js'

const API = '/api/dsh-stcardwriter'
const listeners = new Set<() => void>()
let opened = false
function setOpened(value: boolean): void { opened = value; for (const listener of listeners) listener() }
function subscribe(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener) }

interface HarnessInputActions { setDraft(text: string): void; submit(): void }
let harnessBridge: { sessionId: string; actions: HarnessInputActions } | undefined
let bridgeVersion = 0
const bridgeListeners = new Set<() => void>()
function setHarnessBridge(value: typeof harnessBridge): void {
  harnessBridge = value; bridgeVersion += 1; for (const listener of bridgeListeners) listener()
}
function subscribeBridge(listener: () => void): () => void { bridgeListeners.add(listener); return () => bridgeListeners.delete(listener) }

let activeWorkspacePath = ''
function downloadUrl(path: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${API}${path}${separator}workspace=${encodeURIComponent(activeWorkspacePath)}`
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!activeWorkspacePath) throw new Error('请先选择或打开一个 DSH 工作区')
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), 'x-dsh-workspace': encodeURIComponent(activeWorkspacePath), ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string }
    throw new Error(body.error || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

function FooterAction({ wide }: { wide: boolean }) {
  return <button className="stcw-sidebar-button" title="酒馆创作模式" onClick={() => setOpened(true)}>
    <span aria-hidden>✦</span>{wide && <span>酒馆创作</span>}
  </button>
}

function HarnessComposerAction({ sessionId, inputActions }: { sessionId: string; inputActions: HarnessInputActions }) {
  useEffect(() => {
    const value = { sessionId, actions: inputActions }
    setHarnessBridge(value)
    return () => { if (harnessBridge === value) setHarnessBridge(undefined) }
  }, [sessionId, inputActions])
  return <button className="stcw-composer-button" title="打开酒馆创作模式" onClick={() => setOpened(true)}>✦ 酒馆</button>
}

function field(data: any, key: string): string { return typeof data?.[key] === 'string' ? data[key] : '' }
function innerCharacter(asset: TavernAsset): any { return asset.data && typeof asset.data.data === 'object' ? asset.data.data : asset.data }

function TextField(props: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return <label className="stcw-field"><span>{props.label}</span>{props.multiline
    ? <textarea value={props.value} rows={5} onChange={event => props.onChange(event.target.value)} />
    : <input value={props.value} onChange={event => props.onChange(event.target.value)} />}</label>
}

function CharacterEditor({ asset, change }: { asset: TavernAsset; change: (mutate: (asset: TavernAsset) => void) => void }) {
  const data = innerCharacter(asset)
  const set = (key: string, value: unknown) => change(next => {
    const inner = innerCharacter(next)
    inner[key] = value as never
    if (key === 'name' && typeof value === 'string') next.name = value
  })
  const greetings = Array.isArray(data.alternate_greetings) ? data.alternate_greetings.join('\n---\n') : ''
  return <div className="stcw-form">
    <div className="stcw-grid2">
      <TextField label="角色名" value={field(data, 'name')} onChange={value => set('name', value)} />
      <TextField label="版本" value={field(data, 'character_version')} onChange={value => set('character_version', value)} />
      <TextField label="作者" value={field(data, 'creator')} onChange={value => set('creator', value)} />
      <TextField label="标签（逗号分隔）" value={Array.isArray(data.tags) ? data.tags.join(', ') : ''} onChange={value => set('tags', value.split(',').map(v => v.trim()).filter(Boolean))} />
    </div>
    <TextField label="角色描述" multiline value={field(data, 'description')} onChange={value => set('description', value)} />
    <TextField label="性格" multiline value={field(data, 'personality')} onChange={value => set('personality', value)} />
    <TextField label="场景" multiline value={field(data, 'scenario')} onChange={value => set('scenario', value)} />
    <TextField label="第一条消息" multiline value={field(data, 'first_mes')} onChange={value => set('first_mes', value)} />
    <TextField label="对话示例" multiline value={field(data, 'mes_example')} onChange={value => set('mes_example', value)} />
    <TextField label="备选开场（用单独一行 --- 分隔）" multiline value={greetings} onChange={value => set('alternate_greetings', value ? value.split(/\n---\n/) : [])} />
    <TextField label="系统提示" multiline value={field(data, 'system_prompt')} onChange={value => set('system_prompt', value)} />
    <TextField label="历史后指令" multiline value={field(data, 'post_history_instructions')} onChange={value => set('post_history_instructions', value)} />
    <TextField label="创作者备注" multiline value={field(data, 'creator_notes')} onChange={value => set('creator_notes', value)} />
  </div>
}

const ENTRY_DEFAULTS: Record<string, unknown> = {
  key: [], keysecondary: [], comment: '', content: '', constant: false, vectorized: false,
  selective: true, selectiveLogic: 0, order: 100, position: 0, disable: false,
  ignoreBudget: false, excludeRecursion: false, preventRecursion: false, probability: 100,
  useProbability: true, depth: 4, group: '', groupOverride: false, groupWeight: 100,
}

function worldEntries(asset: TavernAsset): Record<string, any> {
  const current: any = asset.data.entries
  if (current && !Array.isArray(current) && typeof current === 'object') return current
  const converted: Record<string, any> = {}
  if (Array.isArray(current)) current.forEach((entry, index) => { converted[String(entry?.uid ?? entry?.id ?? index)] = entry })
  return converted
}

function WorldbookEditor({ asset, change }: { asset: TavernAsset; change: (mutate: (asset: TavernAsset) => void) => void }) {
  const entries = worldEntries(asset)
  const ids = Object.keys(entries).sort((a, b) => Number(a) - Number(b))
  const [selected, setSelected] = useState(ids[0] || '')
  useEffect(() => { if (!entries[selected]) setSelected(ids[0] || '') }, [asset.id, ids.join(','), selected])
  const entry = entries[selected]
  const alter = (key: string, value: unknown) => change(next => {
    const all = worldEntries(next)
    next.data.entries = all
    if (all[selected]) all[selected][key] = value
  })
  const add = () => change(next => {
    const all = worldEntries(next)
    next.data.entries = all
    const numeric = Object.keys(all).map(Number).filter(Number.isFinite)
    const id = String((numeric.length ? Math.max(...numeric) : -1) + 1)
    all[id] = { ...ENTRY_DEFAULTS, uid: Number(id) }
    setSelected(id)
  })
  const remove = () => change(next => {
    const all = worldEntries(next); next.data.entries = all; delete all[selected]
  })
  return <div className="stcw-world-editor">
    <div className="stcw-entry-list">
      <button onClick={add}>＋ 新条目</button>
      {ids.map(id => <button key={id} className={id === selected ? 'active' : ''} onClick={() => setSelected(id)}>
        <b>{entries[id]?.comment || `条目 ${id}`}</b><small>{Array.isArray(entries[id]?.key) ? entries[id].key.join(', ') : ''}</small>
      </button>)}
    </div>
    <div className="stcw-entry-form">{entry ? <>
      <div className="stcw-row"><strong>条目 {selected}</strong><button className="danger" onClick={remove}>删除</button></div>
      <TextField label="标题 / 备注" value={field(entry, 'comment')} onChange={value => alter('comment', value)} />
      <TextField label="主关键词（逗号分隔）" value={Array.isArray(entry.key) ? entry.key.join(', ') : ''} onChange={value => alter('key', value.split(',').map(v => v.trim()).filter(Boolean))} />
      <TextField label="次关键词（逗号分隔）" value={Array.isArray(entry.keysecondary) ? entry.keysecondary.join(', ') : ''} onChange={value => alter('keysecondary', value.split(',').map(v => v.trim()).filter(Boolean))} />
      <TextField label="注入内容" multiline value={field(entry, 'content')} onChange={value => alter('content', value)} />
      <div className="stcw-grid2">
        <TextField label="顺序" value={String(entry.order ?? 100)} onChange={value => alter('order', Number(value) || 0)} />
        <TextField label="深度" value={String(entry.depth ?? 4)} onChange={value => alter('depth', Number(value) || 0)} />
        <TextField label="概率 %" value={String(entry.probability ?? 100)} onChange={value => alter('probability', Math.max(0, Math.min(100, Number(value) || 0)))} />
        <TextField label="分组" value={field(entry, 'group')} onChange={value => alter('group', value)} />
      </div>
      <div className="stcw-checks">
        <label><input type="checkbox" checked={entry.constant === true} onChange={e => alter('constant', e.target.checked)} />常驻</label>
        <label><input type="checkbox" checked={entry.disable === true} onChange={e => alter('disable', e.target.checked)} />禁用</label>
        <label><input type="checkbox" checked={entry.selective !== false} onChange={e => alter('selective', e.target.checked)} />使用次关键词</label>
        <label><input type="checkbox" checked={entry.caseSensitive === true} onChange={e => alter('caseSensitive', e.target.checked)} />区分大小写</label>
      </div>
    </> : <div className="stcw-empty">新建一个世界书条目开始写作</div>}</div>
  </div>
}

function EmbeddedWorldbookEditor({ asset, change }: { asset: TavernAsset; change: (mutate: (asset: TavernAsset) => void) => void }) {
  const data = innerCharacter(asset)
  const book = data.character_book && typeof data.character_book === 'object' && !Array.isArray(data.character_book) ? data.character_book : undefined
  const create = () => change(next => { innerCharacter(next).character_book = { name: `${next.name} 世界书`, description: '', entries: [] } })
  const remove = () => { if (confirm('移除这张角色卡的内嵌世界书？其他附属资源不会受影响。')) change(next => { delete innerCharacter(next).character_book }) }
  if (!book) return <details className="stcw-embedded-book"><summary>内嵌世界书</summary><p className="stcw-hint">这张角色卡目前没有 character_book。</p><button onClick={create}>＋ 新建内嵌世界书</button></details>
  const bookAsset = { ...asset, kind: 'worldbook' as const, format: 'worldbook' as const, name: typeof book.name === 'string' ? book.name : `${asset.name} 世界书`, data: book }
  const changeBook = (mutate: (asset: TavernAsset) => void) => change(next => {
    const inner = innerCharacter(next)
    const nested = { ...next, kind: 'worldbook' as const, format: 'worldbook' as const, data: inner.character_book }
    mutate(nested)
    inner.character_book = nested.data
  })
  return <details className="stcw-embedded-book"><summary>内嵌世界书 · 可写作与触发预览</summary><div className="stcw-row"><span className="stcw-safe-note">保存在角色卡 character_book 中，导出与原卡同行。</span><button className="danger" onClick={remove}>移除内嵌世界书</button></div><WorldbookEditor asset={bookAsset} change={changeBook} /><div className="stcw-embedded-preview"><Preview asset={bookAsset} /></div></details>
}

function PresetEditor({ asset, change }: { asset: TavernAsset; change: (mutate: (asset: TavernAsset) => void) => void }) {
  const prompts: any[] = Array.isArray(asset.data.prompts) ? asset.data.prompts as any[] : []
  const [selected, setSelected] = useState(0)
  const alterRoot = (key: string, value: unknown) => change(next => { (next.data as any)[key] = value; if (key === 'name' && typeof value === 'string') next.name = value })
  const alterPrompt = (key: string, value: unknown) => change(next => {
    const list: any[] = Array.isArray(next.data.prompts) ? next.data.prompts as any[] : []
    if (list[selected]) list[selected][key] = value
  })
  const add = () => change(next => {
    if (!Array.isArray(next.data.prompts)) next.data.prompts = []
    const list = next.data.prompts as any[]
    const identifier = `custom-${Date.now()}`
    list.push({ name: '新提示', identifier, role: 'system', content: '', system_prompt: true })
    if (!Array.isArray(next.data.prompt_order)) next.data.prompt_order = [{ character_id: 100001, order: [] }]
    const group: any = (next.data.prompt_order as any[])[0]
    if (!Array.isArray(group.order)) group.order = []
    group.order.push({ identifier, enabled: true })
    setSelected(list.length - 1)
  })
  if (!Array.isArray(asset.data.prompts)) return <div className="stcw-form">
    <TextField label="预设名称" value={field(asset.data, 'name')} onChange={value => alterRoot('name', value)} />
    <p className="stcw-hint">这是 Context / Instruct / TextGen 预设。可在下方“原始 JSON”中无损编辑全部字段。</p>
    {'story_string' in asset.data && <TextField label="Story String" multiline value={field(asset.data, 'story_string')} onChange={value => alterRoot('story_string', value)} />}
    {'input_sequence' in asset.data && <TextField label="Input Sequence" multiline value={field(asset.data, 'input_sequence')} onChange={value => alterRoot('input_sequence', value)} />}
    {'output_sequence' in asset.data && <TextField label="Output Sequence" multiline value={field(asset.data, 'output_sequence')} onChange={value => alterRoot('output_sequence', value)} />}
  </div>
  const prompt = prompts[selected]
  return <div className="stcw-world-editor">
    <div className="stcw-entry-list"><button onClick={add}>＋ 新提示</button>{prompts.map((item, index) =>
      <button key={String(item.identifier ?? index)} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}>
        <b>{item.name || item.identifier || `提示 ${index + 1}`}</b><small>{item.role || (item.marker ? 'marker' : '')}</small>
      </button>)}</div>
    <div className="stcw-entry-form">
      <TextField label="预设名称" value={field(asset.data, 'name')} onChange={value => alterRoot('name', value)} />
      {prompt && <>
        <TextField label="提示名称" value={field(prompt, 'name')} onChange={value => alterPrompt('name', value)} />
        <div className="stcw-grid2"><TextField label="Identifier" value={field(prompt, 'identifier')} onChange={value => alterPrompt('identifier', value)} /><TextField label="Role" value={field(prompt, 'role')} onChange={value => alterPrompt('role', value)} /></div>
        <TextField label="提示内容" multiline value={field(prompt, 'content')} onChange={value => alterPrompt('content', value)} />
      </>}
    </div>
  </div>
}

function RawEditor({ asset, apply }: { asset: TavernAsset; apply: (data: any) => void }) {
  const [raw, setRaw] = useState(() => JSON.stringify(asset.data, null, 2))
  const [error, setError] = useState('')
  useEffect(() => { setRaw(JSON.stringify(asset.data, null, 2)); setError('') }, [asset.id])
  const parse = () => {
    try { const value = JSON.parse(raw); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('顶层必须是对象'); apply(value); setError('已应用') }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
  }
  return <details className="stcw-raw"><summary>原始 JSON（保真编辑）</summary><textarea value={raw} onChange={e => setRaw(e.target.value)} rows={18} /><div className="stcw-row"><button onClick={parse}>应用 JSON</button><span>{error}</span></div></details>
}

function includesKeyword(text: string, keyword: string, sensitive: boolean, whole: boolean): boolean {
  if (!keyword) return false
  const haystack = sensitive ? text : text.toLocaleLowerCase()
  const needle = sensitive ? keyword : keyword.toLocaleLowerCase()
  if (!whole) return haystack.includes(needle)
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}\\p{N}_]|$)`, sensitive ? 'u' : 'iu').test(text)
}

function activeLoreEntries(asset: TavernAsset, scan: string): any[] {
  const entries = Object.values(worldEntries(asset))
  return entries.filter(entry => {
    if (entry.disable === true) return false
    if (entry.constant === true) return true
    const primary = Array.isArray(entry.key) ? entry.key : []
    const secondary = Array.isArray(entry.keysecondary) ? entry.keysecondary : []
    const match = (key: unknown) => typeof key === 'string' && includesKeyword(scan, key, entry.caseSensitive === true, entry.matchWholeWords === true)
    if (!primary.some(match)) return false
    if (entry.selective === false || secondary.length === 0) return true
    const matches = secondary.map(match)
    switch (Number(entry.selectiveLogic ?? 0)) {
      case 1: return !matches.every(Boolean)
      case 2: return !matches.some(Boolean)
      case 3: return matches.every(Boolean)
      default: return matches.some(Boolean)
    }
  }).sort((a, b) => Number(a.order ?? 100) - Number(b.order ?? 100))
}

function Preview({ asset }: { asset: TavernAsset }) {
  const [scan, setScan] = useState('')
  if (asset.kind === 'character') {
    const data = innerCharacter(asset)
    return <div className="stcw-preview-card"><div className="stcw-avatar">{field(data, 'name').slice(0, 1) || '?'}</div><h2>{field(data, 'name') || '未命名角色'}</h2>
      <div className="stcw-tags">{(Array.isArray(data.tags) ? data.tags : []).map((tag: string) => <span key={tag}>{tag}</span>)}</div>
      <h4>第一条消息</h4><pre>{field(data, 'first_mes') || '尚未填写'}</pre><h4>场景</h4><pre>{field(data, 'scenario') || '尚未填写'}</pre><h4>角色描述</h4><pre>{field(data, 'description') || '尚未填写'}</pre></div>
  }
  if (asset.kind === 'worldbook') {
    const active = activeLoreEntries(asset, scan)
    return <div><h3>世界书激活预览</h3><TextField label="模拟聊天文本" multiline value={scan} onChange={setScan} /><div className="stcw-preview-note">命中 {active.length} 个条目（预览关键词与逻辑；概率/递归由 SillyTavern 最终执行）</div>
      {active.map((entry, index) => <article className="stcw-lore-hit" key={index}><b>{entry.comment || `条目 ${index + 1}`}</b><small>{Array.isArray(entry.key) ? entry.key.join(', ') : ''}</small><pre>{entry.content}</pre></article>)}</div>
  }
  const prompts: any[] = Array.isArray(asset.data.prompts) ? asset.data.prompts as any[] : []
  const byId = new Map(prompts.map(prompt => [String(prompt.identifier ?? ''), prompt]))
  const orders: any[] = Array.isArray(asset.data.prompt_order) ? asset.data.prompt_order as any[] : []
  const group = orders.find(value => value?.character_id === 100001) || orders[0]
  const ordered = Array.isArray(group?.order) ? group.order.filter((value: any) => value?.enabled !== false).map((value: any) => byId.get(String(value.identifier))).filter(Boolean) : prompts
  return <div><h3>提示顺序预览</h3>{ordered.length ? ordered.map((prompt: any, index: number) => <article className="stcw-prompt" key={String(prompt.identifier ?? index)}><div><b>{index + 1}. {prompt.name || prompt.identifier}</b><span>{prompt.role || (prompt.marker ? 'marker' : '')}</span></div><pre>{prompt.marker ? `〔SillyTavern 动态片段：${prompt.identifier}〕` : prompt.content || '（空）'}</pre></article>) : <pre>{field(asset.data, 'story_string') || field(asset.data, 'input_sequence') || JSON.stringify(asset.data, null, 2)}</pre>}</div>
}

function embeddedPath(uri: unknown): string | undefined {
  if (typeof uri !== 'string') return undefined
  if (uri.startsWith('__asset:')) return uri.slice('__asset:'.length).replaceAll('\\', '/').replace(/^\/+/, '')
  if (/^(?:embeded|embedded):\/\//i.test(uri)) return uri.replace(/^(?:embeded|embedded):\/\//i, '').replaceAll('\\', '/').replace(/^\/+/, '')
  return undefined
}

function nonWorldAssets(asset: TavernAsset): { index: number; value: any; path?: string }[] {
  const data = innerCharacter(asset)
  const assets: any[] = Array.isArray(data.assets) ? data.assets : []
  return assets.map((value, index) => ({ value, index, path: embeddedPath(value?.uri) }))
    .filter(item => item.value && typeof item.value === 'object' && !['worldbook', 'lorebook'].includes(String(item.value.type || '').toLowerCase()))
}

function ResourceInspector({ asset }: { asset: TavernAsset }) {
  if (asset.kind !== 'character') return null
  const data = innerCharacter(asset)
  const assets = nonWorldAssets(asset)
  const resources = asset.resources || []
  return <details className="stcw-resources" open><summary>角色卡附属资源</summary>
    <div className="stcw-resource-badges"><span className={data.character_book && typeof data.character_book === 'object' ? 'ok' : ''}>{data.character_book && typeof data.character_book === 'object' ? '✓ 已检测到内嵌世界书' : '未附带内嵌世界书'}</span><span>{assets.length} 个非世界书资产</span><span>{resources.length} 个嵌入文件</span></div>
    {assets.map(item => {
      const present = !item.path || resources.some(resource => resource.path.toLowerCase() === item.path!.toLowerCase())
      return <div className="stcw-resource-row" key={item.index}><b>{item.value.name || `资源 ${item.index + 1}`}</b><span>{item.value.type || 'other'}</span><code>{item.value.uri || '无 URI'}</code>{!present && <em>缺少嵌入文件</em>}</div>
    })}
    {resources.filter(resource => !assets.some(item => item.path?.toLowerCase() === resource.path.toLowerCase())).map(resource => <div className="stcw-resource-row" key={resource.id}><b>{resource.path}</b><span>未引用文件</span><code>{resource.mimeType || 'binary'} · {Math.ceil(((resource.binary?.bytes ?? (resource.dataBase64 ? BufferlessBase64Size(resource.dataBase64) : 0))) / 1024)} KiB</code></div>)}
  </details>
}

function BufferlessBase64Size(value: string): number {
  return Math.max(0, Math.floor(value.length * 3 / 4) - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0))
}

function MigrationTool({ project, target, accept, notice }: { project: TavernProject; target: TavernAsset; accept: (project: TavernProject) => void; notice: (value: string) => void }) {
  const sources = project.assets.filter(value => value.kind === 'character' && value.id !== target.id)
  const [sourceId, setSourceId] = useState(sources[0]?.id || '')
  const source = sources.find(value => value.id === sourceId) || sources[0]
  const candidates = source ? nonWorldAssets(source) : []
  const referenced = new Set(candidates.map(value => value.path?.toLowerCase()).filter(Boolean))
  const orphanResources = (source?.resources || []).filter(resource => !referenced.has(resource.path.toLowerCase()))
  const [assetIndexes, setAssetIndexes] = useState<number[]>([])
  const [resourceIds, setResourceIds] = useState<string[]>([])
  useEffect(() => {
    setAssetIndexes(candidates.map(value => value.index)); setResourceIds(orphanResources.map(value => value.id))
  }, [source?.id])
  if (!sources.length) return <div className="stcw-hint">项目中再导入或新建一张角色卡后，可在这里迁移附属资源。</div>
  const toggle = <T,>(list: T[], value: T, checked: boolean): T[] => checked ? [...new Set([...list, value])] : list.filter(item => item !== value)
  const migrate = async () => {
    if (!source) return
    const response = await api<{ project: TavernProject; result: { migratedAssets: number; migratedResources: number; renamed: number } }>(`/projects/${project.id}/assets/${target.id}/migrate`, {
      method: 'POST', body: JSON.stringify({ sourceAssetId: source.id, assetIndexes, resourceIds }),
    })
    accept(response.project)
    notice(`已迁移 ${response.result.migratedAssets} 个资产、${response.result.migratedResources} 个文件${response.result.renamed ? `，${response.result.renamed} 个冲突文件已改名` : ''}`)
  }
  return <details className="stcw-migrate"><summary>从其他角色卡迁移附属资源</summary>
    <label className="stcw-field"><span>源角色卡</span><select value={source?.id || ''} onChange={event => setSourceId(event.target.value)}>{sources.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
    {source && innerCharacter(source).character_book && <p className="stcw-safe-note">源卡带有内嵌世界书；迁移工具会明确跳过它。</p>}
    <div className="stcw-migrate-list">{candidates.map(item => <label key={item.index}><input type="checkbox" checked={assetIndexes.includes(item.index)} onChange={event => setAssetIndexes(toggle(assetIndexes, item.index, event.target.checked))} /><span><b>{item.value.name || `资源 ${item.index + 1}`}</b><small>{item.value.type || 'other'} · {item.value.uri || '无 URI'}</small></span></label>)}
      {orphanResources.map(resource => <label key={resource.id}><input type="checkbox" checked={resourceIds.includes(resource.id)} onChange={event => setResourceIds(toggle(resourceIds, resource.id, event.target.checked))} /><span><b>{resource.path}</b><small>未引用附属文件</small></span></label>)}</div>
    <button disabled={!assetIndexes.length && !resourceIds.length} onClick={() => void migrate().catch(error => notice(error.message))}>迁移所选到当前角色卡</button>
  </details>
}

function HarnessPanel({ workspacePath, project, asset }: { workspacePath: string; project: TavernProject; asset?: TavernAsset }) {
  useSyncExternalStore(subscribeBridge, () => bridgeVersion)
  const defaultPrompt = useMemo(() => asset
    ? `请在酒馆创作项目“${project.name}”中协助编辑${asset.kind === 'character' ? '角色卡' : asset.kind === 'worldbook' ? '世界书' : '预设'}“${asset.name}”。先读取项目与资源，保留未知字段和所有附属资源，再按我的要求修改。\n\n我的要求：`
    : `请在空的酒馆创作项目“${project.name}”中根据我的要求创建资源。\n\n我的要求： `, [project.id, project.name, asset?.id, asset?.name, asset?.kind])
  const [prompt, setPrompt] = useState(defaultPrompt)
  useEffect(() => setPrompt(defaultPrompt), [defaultPrompt])
  const handoff = (submit: boolean) => {
    if (!harnessBridge) return
    const context = `${prompt}\n\n工作区绝对路径：${workspacePath}\n项目 ID：${project.id}${asset ? `\n当前资源 ID：${asset.id}` : ''}`
    harnessBridge.actions.setDraft(context)
    if (submit) { harnessBridge.actions.submit(); setOpened(false) }
  }
  return <section className="stcw-harness"><div className="stcw-panel-title">AI Harness 输入</div><textarea value={prompt} onChange={event => setPrompt(event.target.value)} rows={9} placeholder="告诉酒馆创作 Agent 要写什么或修改什么…" />
    <div className="stcw-harness-actions"><button disabled={!harnessBridge || !prompt.trim()} onClick={() => handoff(false)}>放入输入框</button><button className="primary" disabled={!harnessBridge || !prompt.trim()} onClick={() => handoff(true)}>发送给 Agent</button></div>
    <p className="stcw-hint">{harnessBridge ? `已连接当前 Harness 会话 · 资源存储于 ${workspacePath}\\.tavernres` : '当前没有可连接的 Harness 会话；仍可手动编辑资源，或先在该工作区新建会话。'}</p></section>
}

function Workbench(props: any) {
  const isOpen = useSyncExternalStore(subscribe, () => opened)
  const currentWorkspace = props.useSessions((state: any) => state.current ? state.byId[state.current]?.cwd : undefined)
  const recentWorkspace = props.useWorkspaces((state: any) => state.items.find((item: any) => item.workspaceId === state.recentWorkspaceId)?.path)
  const workspacePath = currentWorkspace || recentWorkspace || ''
  activeWorkspacePath = workspacePath
  const [projects, setProjects] = useState<any[]>([])
  const [project, setProject] = useState<TavernProject | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [notice, setNotice] = useState('')
  const asset = project?.assets.find(value => value.id === selectedId) || project?.assets[0]
  const loadProjects = async (preferred?: string | null) => {
    const result = await api<{ projects: any[] }>('/projects'); setProjects(result.projects)
    const id = preferred === null ? result.projects[0]?.id : preferred || project?.id || result.projects[0]?.id
    if (id) { const detail = await api<{ project: TavernProject }>(`/projects/${id}`); setProject(detail.project); setSelectedId(detail.project.assets[0]?.id || '') }
    else setProject(null)
  }
  useEffect(() => {
    setProject(null); setProjects([]); setSelectedId('')
    if (isOpen && workspacePath) void loadProjects().catch(error => setNotice(error.message))
  }, [isOpen, workspacePath])
  if (!isOpen) return null
  if (!workspacePath) return <div className="stcw-layer"><div className="stcw-workbench"><header><b>✦ 酒馆创作模式</b><button className="stcw-close" onClick={() => setOpened(false)}>×</button></header><main className="stcw-welcome"><h2>请先选择工作区</h2><p>项目与导入资源将保存在该工作区的 <code>.tavernres</code> 中。</p></main></div></div>
  const createProject = async () => { const result = await api<{ project: TavernProject }>('/projects', { method: 'POST', body: JSON.stringify({}) }); await loadProjects(result.project.id) }
  const pickProject = async (id: string) => { const detail = await api<{ project: TavernProject }>(`/projects/${id}`); setProject(detail.project); setSelectedId(detail.project.assets[0]?.id || '') }
  const acceptProject = (next: TavernProject) => {
    setProject(next)
    setProjects(current => current.map(item => item.id === next.id ? {
      ...item, name: next.name, updatedAt: next.updatedAt, assetCount: next.assets.length,
      counts: {
        character: next.assets.filter(value => value.kind === 'character').length,
        worldbook: next.assets.filter(value => value.kind === 'worldbook').length,
        preset: next.assets.filter(value => value.kind === 'preset').length,
      },
    } : item))
  }
  const changeAsset = (mutate: (asset: TavernAsset) => void) => setProject(current => {
    if (!current || !asset) return current
    const next = structuredClone(current); const selected = next.assets.find(value => value.id === asset.id); if (selected) mutate(selected); return next
  })
  const save = async () => { if (!project || !asset) return; const result = await api<{ project: TavernProject }>(`/projects/${project.id}/assets/${asset.id}`, { method: 'PUT', body: JSON.stringify({ asset }) }); acceptProject(result.project); setNotice('已保存') }
  const add = async (kind: AssetKind) => { if (!project) return; const result = await api<{ project: TavernProject }>(`/projects/${project.id}/assets`, { method: 'POST', body: JSON.stringify({ kind }) }); acceptProject(result.project); setSelectedId(result.project.assets.at(-1)?.id || '') }
  const importFiles = async (files: FileList | null) => {
    if (!project || !files?.length) return
    setNotice('正在导入…')
    const encoded = await Promise.all([...files].map(file => new Promise<{ name: string; data: string }>((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve({ name: file.name, data: String(reader.result).split(',')[1] || '' }); reader.readAsDataURL(file)
    })))
    const result = await api<{ project: TavernProject; imported: number; errors: { filename: string; error: string }[] }>(`/projects/${project.id}/import`, { method: 'POST', body: JSON.stringify({ files: encoded }) })
    const added = result.project.assets.slice(-result.imported)
    const embeddedBooks = added.filter(value => value.kind === 'character' && innerCharacter(value).character_book && typeof innerCharacter(value).character_book === 'object').length
    const embeddedFiles = added.reduce((sum, value) => sum + (value.resources?.length || 0), 0)
    acceptProject(result.project); setSelectedId(result.project.assets.at(-1)?.id || ''); setNotice(`导入 ${result.imported} 项${embeddedBooks ? `，检测到 ${embeddedBooks} 本内嵌世界书` : ''}${embeddedFiles ? `，保留 ${embeddedFiles} 个附属文件` : ''}${result.errors.length ? `，${result.errors.length} 项失败` : ''}`)
  }
  const deleteAsset = async () => { if (!project || !asset || !confirm(`删除“${asset.name}”？`)) return; const result = await api<{ project: TavernProject }>(`/projects/${project.id}/assets/${asset.id}`, { method: 'DELETE' }); acceptProject(result.project); setSelectedId(result.project.assets[0]?.id || '') }
  const deleteProject = async () => {
    if (!project || !confirm(`删除项目“${project.name}”及其中全部资源？`)) return
    await api(`/projects/${project.id}`, { method: 'DELETE' })
    setProject(null); setSelectedId(''); setNotice('项目已删除'); await loadProjects(null)
  }
  return <div className="stcw-layer"><div className="stcw-workbench">
    <header><div><b>✦ 酒馆创作模式</b><select value={project?.id || ''} onChange={e => void pickProject(e.target.value)}><option value="">选择项目</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name} ({item.assetCount})</option>)}</select><button onClick={() => void createProject()}>新建空项目</button><small title={workspacePath}>工作区 · {workspacePath.replaceAll('\\', '/').split('/').at(-1)}</small></div><button className="stcw-close" onClick={() => setOpened(false)}>×</button></header>
    {!project ? <main className="stcw-welcome"><h2>从空项目开始</h2><p>可批量导入角色卡、世界书和预设，也可以逐项新建。</p><button onClick={() => void createProject()}>新建空项目</button></main> : <>
      <div className="stcw-toolbar"><input className="stcw-project-name" value={project.name} onChange={e => setProject({ ...project, name: e.target.value })} onBlur={() => void api(`/projects/${project.id}`, { method: 'PUT', body: JSON.stringify({ name: project.name }) }).then(() => loadProjects(project.id))} />
        <label className="stcw-file" title="可一次选择多个 JSON、PNG、CHARX 或 ZIP">导入资源<input type="file" multiple accept=".json,.png,.charx,.zip,application/json,image/png,application/zip" onChange={e => { void importFiles(e.target.files); e.currentTarget.value = '' }} /></label>
        <button onClick={() => void add('character')}>＋角色卡</button><button onClick={() => void add('worldbook')}>＋世界书</button><button onClick={() => void add('preset')}>＋预设</button>
        {asset ? <a className="stcw-button" title={`导出“${asset.name}”`} href={downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=${asset.kind === 'character' ? (asset.source?.container === 'charx' ? 'charx' : 'png') : 'json'}`)}>导出当前资源</a> : <span className="stcw-button disabled" title="请先选择资源">导出当前资源</span>}
        <a className="stcw-button" href={downloadUrl(`/projects/${project.id}/export`)}>导出全部资源 ZIP</a><button className="danger" onClick={() => void deleteProject()}>删除项目</button><span className="stcw-notice">{notice}</span>
      </div>
      <main className="stcw-studio"><aside className="stcw-ai-pane"><HarnessPanel workspacePath={workspacePath} project={project} asset={asset} />
        <div className="stcw-panel-title">项目资源</div><div className="stcw-assets">{project.assets.length ? project.assets.map(item => <button key={item.id} className={item.id === asset?.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><span>{item.kind === 'character' ? '角色' : item.kind === 'worldbook' ? '世界' : '预设'}</span><b>{item.name}</b><small>{item.format}{item.kind === 'character' && innerCharacter(item).character_book ? ' · 内嵌世界书' : ''}{item.resources?.length ? ` · ${item.resources.length} 文件` : ''}</small></button>) : <div className="stcw-empty">这是一个空项目。用上方按钮新建或批量导入。</div>}</div>
        {asset?.kind === 'character' && <MigrationTool project={project} target={asset} accept={acceptProject} notice={setNotice} />}</aside>
        <section className="stcw-resource-pane"><div className="stcw-resource-grid"><section className="stcw-editor">{asset ? <><div className="stcw-editor-head"><div><input value={asset.name} onChange={e => changeAsset(next => { next.name = e.target.value })} /><small>{asset.format}</small></div><div><button onClick={() => void save()}>保存</button>{asset.kind === 'character' && <><a className="stcw-button" href={downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=png`)}>PNG</a><a className="stcw-button" href={downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=v3`)}>V3 JSON</a><a className="stcw-button" href={downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=charx`)}>CHARX</a></>} {asset.kind !== 'character' && <a className="stcw-button" href={downloadUrl(`/projects/${project.id}/assets/${asset.id}/export?format=json`)}>导出 JSON</a>}<button className="danger" onClick={() => void deleteAsset()}>删除</button></div></div>
          <ResourceInspector asset={asset} />{asset.kind === 'character' ? <><CharacterEditor asset={asset} change={changeAsset} /><EmbeddedWorldbookEditor asset={asset} change={changeAsset} /></> : asset.kind === 'worldbook' ? <WorldbookEditor asset={asset} change={changeAsset} /> : <PresetEditor asset={asset} change={changeAsset} />}
          <RawEditor asset={asset} apply={data => changeAsset(next => { next.data = data })} /></> : <div className="stcw-empty">请选择或新建一个资源</div>}</section>
          <aside className="stcw-preview"><div className="stcw-preview-title">资源实时预览</div>{asset ? <Preview asset={asset} /> : null}</aside></div></section></main>
    </>}
  </div></div>
}

const CSS = `
.stcw-sidebar-button{border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;white-space:nowrap}.stcw-sidebar-button:hover{background:color-mix(in srgb,currentColor 10%,transparent)}
.stcw-layer{position:fixed;inset:0;z-index:10000;background:rgba(8,7,12,.7);backdrop-filter:blur(8px);pointer-events:auto;padding:20px;color:#eee;font:14px/1.45 Inter,system-ui,sans-serif}.stcw-workbench{height:100%;display:flex;flex-direction:column;background:#15121d;border:1px solid #3a3347;border-radius:16px;box-shadow:0 24px 80px #0009;overflow:hidden}.stcw-workbench header{height:58px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #302a3a;background:#1c1825}.stcw-workbench header>div{display:flex;align-items:center;gap:12px}.stcw-workbench button,.stcw-button,.stcw-file{border:1px solid #51475f;background:#282232;color:#eee;padding:7px 10px;border-radius:7px;cursor:pointer;text-decoration:none}.stcw-workbench button:hover,.stcw-button:hover,.stcw-file:hover{background:#373043}.stcw-button.disabled{opacity:.45;cursor:not-allowed;pointer-events:none}.stcw-workbench button.danger{border-color:#7a3f4b;color:#ffabb8}.stcw-close{font-size:24px!important;line-height:1;padding:5px 10px!important}.stcw-workbench select,.stcw-workbench input,.stcw-workbench textarea{background:#100e16;color:#eee;border:1px solid #463d52;border-radius:6px;padding:8px;box-sizing:border-box}.stcw-file input{display:none}.stcw-toolbar{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #302a3a;overflow-x:auto}.stcw-project-name{font-weight:700;width:220px;flex:0 0 auto}.stcw-notice{color:#b9a7cf;margin-left:auto;white-space:nowrap}.stcw-columns{display:grid;grid-template-columns:230px minmax(420px,1fr) 360px;min-height:0;flex:1}.stcw-assets,.stcw-editor,.stcw-preview{min-height:0;overflow:auto}.stcw-assets{padding:9px;border-right:1px solid #302a3a}.stcw-assets>button{display:grid;width:100%;text-align:left;margin-bottom:7px;grid-template-columns:auto 1fr;gap:2px 8px}.stcw-assets>button>span{grid-row:1/3;background:#493c5b;color:#d8c8ec;font-size:11px;padding:3px 5px;border-radius:4px;align-self:center}.stcw-assets small,.stcw-entry-list small{color:#9d91a9}.stcw-assets .active,.stcw-entry-list .active{border-color:#9b75ce;background:#392c4a}.stcw-editor{padding:14px}.stcw-editor-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:14px;position:sticky;top:-14px;background:#15121ded;padding:10px 0;z-index:2}.stcw-editor-head>div{display:flex;gap:7px;align-items:center}.stcw-editor-head input{font-size:18px;font-weight:700}.stcw-form{display:flex;flex-direction:column;gap:10px}.stcw-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.stcw-field{display:flex;flex-direction:column;gap:5px}.stcw-field>span{color:#bcaec9;font-size:12px}.stcw-field textarea{width:100%;resize:vertical}.stcw-world-editor{display:grid;grid-template-columns:180px 1fr;gap:12px}.stcw-entry-list{display:flex;flex-direction:column;gap:6px;max-height:68vh;overflow:auto}.stcw-entry-list>button{display:flex;flex-direction:column;text-align:left}.stcw-entry-form{display:flex;flex-direction:column;gap:10px}.stcw-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.stcw-checks{display:flex;gap:14px;flex-wrap:wrap}.stcw-checks label{display:flex;align-items:center;gap:5px}.stcw-raw{margin-top:18px;border-top:1px solid #342d3e;padding-top:12px}.stcw-raw summary{cursor:pointer;color:#bda5d8}.stcw-raw textarea{width:100%;font:12px/1.45 ui-monospace,monospace;margin-top:8px}.stcw-preview{border-left:1px solid #302a3a;background:#100e16;padding:15px}.stcw-preview-title{text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:#a28eaf;margin-bottom:12px}.stcw-preview pre{white-space:pre-wrap;word-break:break-word;font:13px/1.55 inherit}.stcw-avatar{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;margin:10px auto;background:linear-gradient(135deg,#9a67cc,#4d78bd);font-size:30px}.stcw-preview-card h2{text-align:center}.stcw-tags{display:flex;justify-content:center;flex-wrap:wrap;gap:5px}.stcw-tags span{background:#332740;padding:3px 7px;border-radius:20px;font-size:11px}.stcw-lore-hit,.stcw-prompt{border:1px solid #3b3247;border-radius:8px;padding:10px;margin:9px 0;background:#191520}.stcw-lore-hit small{display:block;color:#a795b7}.stcw-prompt>div{display:flex;justify-content:space-between}.stcw-prompt span{color:#a795b7}.stcw-preview-note,.stcw-hint{color:#a99ab7;font-size:12px}.stcw-empty,.stcw-welcome{display:grid;place-content:center;text-align:center;color:#9f93aa;min-height:180px}.stcw-welcome{flex:1}.stcw-welcome button{justify-self:center}@media(max-width:1050px){.stcw-columns{grid-template-columns:180px minmax(380px,1fr) 300px}}`

const EXTRA_CSS = `
.stcw-composer-button{border:0;background:transparent;color:inherit;padding:4px 7px;border-radius:6px;cursor:pointer}.stcw-composer-button:hover{background:color-mix(in srgb,currentColor 10%,transparent)}
.stcw-studio{display:grid;grid-template-columns:330px minmax(0,1fr);min-height:0;flex:1}.stcw-ai-pane{min-height:0;overflow:auto;padding:12px;border-right:1px solid #302a3a;background:#121019}.stcw-resource-pane{min-width:0;min-height:0}.stcw-resource-grid{height:100%;display:grid;grid-template-columns:minmax(480px,1fr) minmax(300px,36%);min-height:0}.stcw-panel-title{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#aa95ba;margin:3px 0 9px}.stcw-harness{border:1px solid #493c59;background:#1a1622;border-radius:10px;padding:11px;margin-bottom:14px}.stcw-harness textarea{width:100%;resize:vertical}.stcw-harness-actions{display:flex;gap:7px;margin-top:8px}.stcw-harness-actions button{flex:1}.stcw-workbench button.primary{background:#694697;border-color:#9367c8}.stcw-workbench button:disabled{opacity:.45;cursor:not-allowed}.stcw-ai-pane>.stcw-assets{border:0;padding:0;max-height:35vh;overflow:auto}.stcw-migrate{margin-top:12px;border-top:1px solid #302a3a;padding-top:10px}.stcw-migrate summary,.stcw-resources summary{cursor:pointer;color:#ccb5e6;font-weight:700;margin-bottom:9px}.stcw-migrate-list{max-height:190px;overflow:auto;margin:8px 0}.stcw-migrate-list label{display:flex;gap:7px;padding:6px;border-radius:6px}.stcw-migrate-list label:hover{background:#211b29}.stcw-migrate-list label>span{display:flex;min-width:0;flex-direction:column}.stcw-migrate-list small{color:#9e90aa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stcw-safe-note{color:#aee6c1;background:#153421;padding:7px;border-radius:6px;font-size:12px}.stcw-resources{border:1px solid #3d3548;border-radius:8px;padding:9px;margin-bottom:12px}.stcw-resource-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px}.stcw-resource-badges span{padding:3px 7px;border-radius:12px;background:#30283a;font-size:11px}.stcw-resource-badges span.ok{background:#16422a;color:#aee6c1}.stcw-resource-row{display:grid;grid-template-columns:minmax(100px,1fr) auto;gap:2px 8px;padding:6px;border-top:1px solid #2e2736}.stcw-resource-row code{grid-column:1/3;color:#9f90ae;word-break:break-all}.stcw-resource-row em{grid-column:1/3;color:#ffafba}.stcw-workbench header small{color:#998ca5;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:1150px){.stcw-studio{grid-template-columns:285px minmax(0,1fr)}.stcw-resource-grid{grid-template-columns:minmax(420px,1fr) 300px}}`

const EMBEDDED_CSS = `.stcw-embedded-book{margin-top:18px;border:1px solid #493b57;border-radius:9px;padding:10px}.stcw-embedded-book>summary{cursor:pointer;color:#d1b6ea;font-weight:700}.stcw-embedded-book>.stcw-world-editor{margin-top:12px}.stcw-embedded-preview{margin-top:14px;border-top:1px solid #342d3e;padding-top:10px}`

function installStyle(): () => void {
  const style = document.createElement('style'); style.dataset.dshStcardwriter = 'true'; style.textContent = CSS + EXTRA_CSS + EMBEDDED_CSS; document.head.append(style); return () => style.remove()
}

export const inject = ['slots']
export function apply(ctx: any): void {
  ctx.effect(installStyle, 'dsh-stcardwriter: styles')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'stcardwriter', order: 20, label: '酒馆创作' }, FooterAction))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'stcardwriter-workbench', order: 20 }, Workbench))
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ name: 'conversation.input.left', id: 'stcardwriter-composer-action', order: 30, label: '酒馆创作' }, HarnessComposerAction))
}
