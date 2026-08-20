import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { unzipSync, zipSync } from 'fflate'
import {
  ProjectStore, assetSummaryForAgent, characterResourceSummary, copyWorldbookEntries, createAsset, createApiHandler, createWorkspaceStoreResolver,
  deleteWorldbookEntry, detectKind, exportAsset, exportProject, importAsset, migrateCharacterResources, orderedPresetPrompts, patchCharacterFields,
  projectForAgent, projectManifestForAgent, readCharacterFromPng, readCharacterTextResource, selectedAssetFieldsForAgent, toCharacterV2,
  toCharacterV3, toLosslessJson, upsertWorldbookEntry, worldbookEntryRecords,
} from '../dist/index.js'

function assertLosslessJson(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value)
}

function sampleV2() {
  return {
    spec: 'chara_card_v2', spec_version: '2.0',
    vendor_unknown: { keep: true },
    data: {
      name: '林霁', description: '旅店老板', personality: '冷静', scenario: '雨夜',
      first_mes: '欢迎。', mes_example: '<START>\n{{char}}: 坐吧。', creator_notes: '中文备注',
      system_prompt: '', post_history_instructions: '', alternate_greetings: ['又见面了。'],
      tags: ['原创'], creator: '测试者', character_version: '1.2',
      extensions: { vendor: { secret: 42 } }, extra_data: '保留我',
    },
  }
}

test('V2/V3 conversion preserves extension and unknown fields', () => {
  const v2 = sampleV2()
  const v3 = toCharacterV3(v2)
  assert.equal(v3.spec, 'chara_card_v3')
  assert.deepEqual(v3.vendor_unknown, { keep: true })
  assert.deepEqual(v3.data.extensions, { vendor: { secret: 42 } })
  assert.equal(v3.data.extra_data, '保留我')
  assert.equal(toCharacterV2(v3).data.name, '林霁')
})

test('PNG export embeds UTF-8 ccv3 and chara metadata and imports again', () => {
  const asset = importAsset('林霁.json', Buffer.from(JSON.stringify(sampleV2())))
  const file = exportAsset(asset, 'png')
  assert.equal(file.mimeType, 'image/png')
  const parsed = readCharacterFromPng(file.bytes)
  assert.equal(parsed.spec, 'chara_card_v3')
  assert.equal(parsed.data.creator_notes, '中文备注')
  const roundtrip = importAsset('林霁.png', file.bytes)
  assert.equal(roundtrip.name, '林霁')
  assert.ok(roundtrip.source.pngBase64.length > 100)
})

test('CHARX import detects embedded lorebook and preserves every opaque archive file', () => {
  const card = toCharacterV3(sampleV2())
  card.data.character_book = { name: '随卡世界书', entries: [{ id: 1, keys: ['雨'], content: '总是在下雨。', enabled: true, insertion_order: 10 }] }
  card.data.assets = [{ type: 'audio', name: 'theme', uri: 'embeded://assets/audio/theme.ogg', ext: 'ogg' }]
  const audio = Uint8Array.from([0, 1, 2, 127, 128, 254, 255])
  const vendor = Buffer.from('{"vendor":"keep exactly"}\n')
  const input = zipSync({ 'card.json': Buffer.from(JSON.stringify(card)), 'assets/audio/theme.ogg': audio, 'vendor/meta.json': vendor })
  const asset = importAsset('with-assets.charx', input)
  const summary = characterResourceSummary(asset)
  assert.equal(summary.hasEmbeddedWorldbook, true)
  assert.equal(summary.assets[0].backingPresent, true)
  assert.equal(summary.resources.length, 2)
  assert.equal(summary.resources.find(value => value.path.endsWith('.json')).textReadable, true)
  assert.equal(summary.resources.find(value => value.path.endsWith('.ogg')).textReadable, false)
  assert.equal(readCharacterTextResource(asset, { path: 'vendor/meta.json' }).text, vendor.toString())
  assert.throws(() => readCharacterTextResource(asset, { path: 'assets/audio/theme.ogg' }), /文本格式/)
  const output = unzipSync(exportAsset(asset, 'charx').bytes)
  assert.deepEqual(output['assets/audio/theme.ogg'], audio)
  assert.deepEqual(Buffer.from(output['vendor/meta.json']), vendor)
  assert.equal(JSON.parse(Buffer.from(output['card.json']).toString()).data.character_book.name, '随卡世界书')
})

test('reads UTF-8 data URI character attachments by data.assets index', () => {
  const asset = createAsset('character', '文本附件')
  const text = '# 设定\n这是角色卡附带的中文说明。'
  asset.data.data.assets = [{ type: 'document', name: '说明', uri: `data:text/markdown;base64,${Buffer.from(text).toString('base64')}`, ext: 'md' }]
  const decoded = readCharacterTextResource(asset, { assetIndex: 0 })
  assert.equal(decoded.text, text)
  assert.equal(decoded.mimeType, 'text/markdown')
  assert.equal(decoded.source, 'data-uri')
})

test('PNG extended assets survive export and import with binary bytes intact', () => {
  const asset = createAsset('character', '带资源 PNG')
  asset.data.data.assets = [{ type: 'icon', name: '表情', uri: '__asset:assets/icon/face.webp', ext: 'webp' }]
  asset.resources = [{ id: 'face', path: 'assets/icon/face.webp', container: 'png', mimeType: 'image/webp', dataBase64: Buffer.from([9, 8, 7, 6]).toString('base64') }]
  const roundtrip = importAsset('asset.png', exportAsset(asset, 'png').bytes)
  assert.equal(roundtrip.resources.length, 1)
  assert.deepEqual(Buffer.from(roundtrip.resources[0].dataBase64, 'base64'), Buffer.from([9, 8, 7, 6]))
  assert.equal(roundtrip.data.data.assets[0].uri, '__asset:assets/icon/face.webp')
})

test('character asset migration skips lorebooks and safely renames conflicting binary files', () => {
  const source = createAsset('character', '源卡')
  source.data.data.character_book = { name: '绝不迁移', entries: [] }
  source.data.data.assets = [
    { type: 'icon', name: '立绘', uri: 'embeded://assets/icon/shared.png', ext: 'png' },
    { type: 'lorebook', name: '世界书资源', uri: 'embeded://assets/lorebook/book.json', ext: 'json' },
  ]
  source.resources = [
    { id: 'source-image', path: 'assets/icon/shared.png', container: 'charx', dataBase64: Buffer.from('source').toString('base64') },
    { id: 'source-book', path: 'assets/lorebook/book.json', container: 'charx', dataBase64: Buffer.from('{}').toString('base64') },
  ]
  const target = createAsset('character', '目标卡')
  target.data.data.character_book = { name: '目标世界书', entries: [] }
  target.resources = [{ id: 'target-image', path: 'assets/icon/shared.png', container: 'charx', dataBase64: Buffer.from('target').toString('base64') }]
  const result = migrateCharacterResources(target, source)
  assert.deepEqual(result, { migratedAssets: 1, migratedResources: 1, renamed: 1 })
  assert.equal(target.data.data.character_book.name, '目标世界书')
  assert.equal(target.data.data.assets.length, 1)
  assert.match(target.data.data.assets[0].uri, /shared-copy-2\.png$/)
  assert.equal(target.resources.length, 2)
})

test('detects lorebooks and preserves chat-completion prompt order', () => {
  assert.deepEqual(detectKind({ entries: { 0: { key: ['雾'], content: '有雾' } } }), { kind: 'worldbook', format: 'worldbook' })
  const preset = {
    prompts: [
      { identifier: 'a', content: 'A' }, { identifier: 'b', content: 'B' }, { identifier: 'c', content: 'C' },
    ],
    prompt_order: [{ character_id: 100001, order: [
      { identifier: 'c', enabled: true }, { identifier: 'a', enabled: false }, { identifier: 'b', enabled: true },
    ] }],
  }
  assert.deepEqual(orderedPresetPrompts(preset).map(value => value.content), ['C', 'B'])
})

test('project store supports blank assets, multi import and ZIP export', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-stcw-'))
  try {
    const store = new ProjectStore(root)
    const project = await store.create('往返项目')
    await store.addBlankAsset(project.id, 'worldbook', '城镇设定')
    const payloads = [
      { name: 'hero.json', data: Buffer.from(JSON.stringify(sampleV2())).toString('base64') },
      { name: 'preset.json', data: Buffer.from(JSON.stringify({ name: '写作预设', prompts: [], prompt_order: [] })).toString('base64') },
    ]
    const imported = await store.importFiles(project.id, payloads)
    assert.equal(imported.imported, 2)
    assert.equal(imported.project.assets.length, 3)
    const archive = exportProject(imported.project)
    const files = unzipSync(archive.bytes)
    assert.ok(Object.keys(files).some(name => name.startsWith('characters/') && name.endsWith('.png')))
    assert.ok(Object.keys(files).some(name => name === 'worldbooks/城镇设定.json'))
    assert.ok(files['project.json'])
    const persisted = JSON.parse(await readFile(join(root, `${project.id}.json`), 'utf8'))
    assert.equal(persisted.assets.length, 3)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('project persistence externalizes PNG, attachments and binary data URIs from JSON', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-stcw-binary-'))
  try {
    const store = new ProjectStore(root)
    const project = await store.create('二进制外置')
    const card = toCharacterV3(sampleV2())
    const inlineImage = Buffer.from([137, 80, 78, 71, 0, 255, 1])
    card.data.assets = [
      { type: 'icon', name: '内联图', uri: `data:image/png;base64,${inlineImage.toString('base64')}`, ext: 'png' },
      { type: 'document', name: '说明', uri: 'embeded://notes/readme.md', ext: 'md' },
    ]
    const note = Buffer.from('# 附件\n可由 Agent 读取。\n')
    const charx = zipSync({ 'card.json': Buffer.from(JSON.stringify(card)), 'notes/readme.md': note })
    const pngAsset = createAsset('character', 'PNG 原图')
    const png = exportAsset(pngAsset, 'png').bytes
    const imported = await store.importFiles(project.id, [
      { name: 'binary.charx', data: Buffer.from(charx).toString('base64') },
      { name: 'portrait.png', data: Buffer.from(png).toString('base64') },
    ])
    assert.equal(imported.imported, 2)

    const persistedText = await readFile(join(root, `${project.id}.json`), 'utf8')
    assert.doesNotMatch(persistedText, /dataBase64|pngBase64|data:image\/png;base64/)
    const persisted = JSON.parse(persistedText)
    assert.match(persisted.assets[0].data.data.assets[0].uri, /^tavernres-binary:\/\//)
    assert.ok(persisted.assets[0].resources[0].binary.file)
    assert.ok(persisted.assets[1].source.pngFile.file)
    const noteOnDisk = await readFile(join(root, ...persisted.assets[0].resources[0].binary.file.split('/')))
    assert.deepEqual(noteOnDisk, note)

    const loaded = await store.get(project.id)
    assert.match(loaded.assets[0].data.data.assets[0].uri, /^data:image\/png;base64,/)
    assert.equal(Buffer.from(loaded.assets[0].resources[0].dataBase64, 'base64').toString(), note.toString())
    assert.ok(loaded.assets[1].source.pngBase64)
    const agentView = projectForAgent(loaded)
    assertLosslessJson(agentView)
    const agentJson = JSON.stringify(agentView)
    assert.doesNotThrow(() => JSON.parse(agentJson))
    assert.doesNotMatch(agentJson, /dataBase64|pngBase64|data:image\/png;base64/)
    assert.match(agentJson, /tavernres-binary:\/\//)

    await store.delete(project.id)
    await assert.rejects(stat(join(root, `${project.id}.assets`)), /ENOENT/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('Agent projections satisfy the rc8 lossless-JSON contract', () => {
  const project = {
    id: 'blank', name: '空项目', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    assets: [createAsset('character', '无来源角色')],
  }
  const view = projectForAgent(project)
  assertLosslessJson(view)
  assert.equal('source' in view.assets[0], false)
  assert.deepEqual(toLosslessJson({ absent: undefined, values: [, undefined, -0] }), { values: [null, null, 0] })
})

test('Agent project manifests stay compact and fields are read on demand', () => {
  const card = createAsset('character', '长卡')
  card.data.data.description = '长'.repeat(20000)
  card.data.data.first_mes = '你好'
  const project = { id: 'compact', name: '摘要', createdAt: card.createdAt, updatedAt: card.updatedAt, assets: [card] }
  const manifest = projectManifestForAgent(project)
  const full = projectForAgent(project)
  assert.ok(JSON.stringify(manifest).length < JSON.stringify(full).length / 20)
  assert.equal(manifest.assets[0].fields.description.chars, 20000)
  const selected = selectedAssetFieldsForAgent(card, ['first_mes', 'missing'])
  assert.deepEqual(selected.fields, { first_mes: '你好' })
  assert.deepEqual(selected.missing, ['missing'])
  assert.equal(assetSummaryForAgent(card).worldbookEntryCount, 0)
})

test('character patch preserves embedded books and dedicated worldbook tools edit entries', () => {
  const card = createAsset('character', '编辑前')
  card.data.data.character_book = { name: '随卡书', entries: [{ id: 3, keys: ['旧'], content: '旧内容' }] }
  const changed = patchCharacterFields(card, { name: '编辑后', description: '新描述' })
  assert.deepEqual(changed, ['name', 'description'])
  assert.equal(card.name, '编辑后')
  assert.equal(card.data.data.character_book.name, '随卡书')
  assert.throws(() => patchCharacterFields(card, { character_book: {} }), /专用世界书/)
  const created = upsertWorldbookEntry(card, undefined, { keys: ['新'], content: '新内容' })
  assert.equal(created.entryId, '4')
  assert.equal(worldbookEntryRecords(card).length, 2)
  assert.equal(deleteWorldbookEntry(card, '3'), true)
  assert.deepEqual(worldbookEntryRecords(card).map(value => value.id), ['4'])
})

test('worldbook entries copy across character cards with safe conflict policies', () => {
  const source = createAsset('character', '源卡')
  source.data.data.character_book = { name: '源书', entries: [
    { id: 0, keys: ['城'], content: '源条目零' },
    { id: 1, keys: ['河'], content: '源条目一' },
  ] }
  const target = createAsset('character', '目标卡')
  target.data.data.character_book = { name: '目标书', vendor: { keep: true }, entries: [{ id: 0, keys: ['旧'], content: '目标原条目' }] }
  const renumbered = copyWorldbookEntries(source, target, ['0', '1'], 'renumber')
  assert.deepEqual(renumbered.mappings.map(value => [value.sourceId, value.targetId]), [['0', '1'], ['1', '2']])
  assert.equal(target.data.data.character_book.vendor.keep, true)
  assert.deepEqual(worldbookEntryRecords(target).map(value => value.id), ['0', '1', '2'])
  const overwritten = copyWorldbookEntries(source, target, ['0'], 'overwrite')
  assert.equal(overwritten.overwritten, 1)
  assert.equal(worldbookEntryRecords(target).find(value => value.id === '0').entry.content, '源条目零')
  const skipped = copyWorldbookEntries(source, target, ['0'], 'skip')
  assert.equal(skipped.skipped, 1)
})

test('HTTP API closes create → add → save → export loop', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-stcw-api-'))
  const store = new ProjectStore(root)
  const server = createServer(createApiHandler(store))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const base = `http://127.0.0.1:${address.port}/api/dsh-stcardwriter`
  try {
    const created = await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(value => value.json())
    const id = created.project.id
    const added = await fetch(`${base}/projects/${id}/assets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'character' }) }).then(value => value.json())
    const asset = added.project.assets[0]
    asset.name = 'API 角色'
    asset.data.data.name = 'API 角色'
    const savedResponse = await fetch(`${base}/projects/${id}/assets/${asset.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ asset }) })
    assert.equal(savedResponse.status, 200)
    const exported = await fetch(`${base}/projects/${id}/assets/${asset.id}/export?format=v3`)
    assert.match(exported.headers.get('content-disposition'), /API%20%E8%A7%92%E8%89%B2\.json/)
    assert.equal((await exported.json()).spec, 'chara_card_v3')
  } finally {
    await new Promise(resolve => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  }
})

test('workspace API resolver stores project data under workspace .tavernres', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-stcw-workspace-'))
  const server = createServer(createApiHandler(createWorkspaceStoreResolver()))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const base = `http://127.0.0.1:${address.port}/api/dsh-stcardwriter`
  try {
    const response = await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-workspace': encodeURIComponent(workspace) }, body: '{}' })
    assert.equal(response.status, 201)
    const created = await response.json()
    const persisted = JSON.parse(await readFile(join(workspace, '.tavernres', 'projects', `${created.project.id}.json`), 'utf8'))
    assert.equal(persisted.id, created.project.id)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await rm(workspace, { recursive: true, force: true })
  }
})

test('blank asset factories create native structures', () => {
  assert.equal(createAsset('character').data.spec, 'chara_card_v3')
  assert.deepEqual(createAsset('worldbook').data.entries, {})
  assert.ok(Array.isArray(createAsset('preset').data.prompt_order))
})
