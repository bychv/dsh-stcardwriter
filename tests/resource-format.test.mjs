import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'node:http'
import test from 'node:test'
import { build } from 'esbuild'
import { unzipSync, zipSync } from 'fflate'
import {
  checkAssetFormat, normalizeAssetFormat, repairedAssetData, convertWorldbook, copyWorldbookEntries,
  createAsset, importAsset, exportAsset, readCharacterFromPng, upsertWorldbookEntry, ProjectStore, createApiHandler,
} from '../dist/index.js'

const readFixture = name => readFile(new URL(`./fixtures/sillytavern-${name}.json`, import.meta.url))
const cardFixture = async () => importAsset('card.json', await readFixture('character'))
const worldFixture = async () => importAsset('world.json', await readFixture('worldbook'))
const lossless = value => assert.deepEqual(JSON.parse(JSON.stringify(value)), value)
const snapshot = value => structuredClone(value)

function assertEmbedded(entry) {
  assert.equal(typeof entry.id, 'number')
  assert.ok(Array.isArray(entry.keys))
  assert.ok(Array.isArray(entry.secondary_keys))
  assert.equal(typeof entry.content, 'string')
  assert.equal(typeof entry.enabled, 'boolean')
  assert.equal(typeof entry.insertion_order, 'number')
  assert.equal(typeof entry.use_regex, 'boolean')
  assert.ok(['before_char', 'after_char'].includes(entry.position))
  assert.equal(typeof entry.extensions.position, 'number')
  assert.equal(Array.isArray(entry.extensions), false)
}

test('the two user samples retain native shapes; optional CC defaults are not import errors', async () => {
  const card = await cardFixture()
  const world = await worldFixture()
  assert.equal(card.kind, 'character')
  assert.equal(world.kind, 'worldbook')
  assert.equal(checkAssetFormat(card).valid, true)
  assert.equal(checkAssetFormat(world).valid, true)
  assert.equal(checkAssetFormat(card).warningCount, 2)
  assert.deepEqual(normalizeAssetFormat(world).data, world.data)
  const before = snapshot(card)
  const fixed = repairedAssetData(card)
  assert.deepEqual(card, before)
  assert.deepEqual(fixed.data.character_book.entries, card.data.data.character_book.entries)
  assert.deepEqual(fixed.data.group_only_greetings, [])
  assert.deepEqual(fixed.data.character_book.extensions, {})
  assert.deepEqual(repairedAssetData({ kind: 'character', data: fixed }), fixed)
  lossless(checkAssetFormat(card))
})

test('sparse Agent-created entries get correct native defaults and ID fields', () => {
  for (const kind of ['character', 'worldbook']) {
    const asset = createAsset(kind)
    upsertWorldbookEntry(asset, undefined, { keys: ['城'], content: '城在山上', custom: { keep: true } })
    if (kind === 'character') {
      const entry = asset.data.data.character_book.entries[0]
      assertEmbedded(entry)
      assert.equal(entry.id, 0)
      assert.equal(entry.enabled, true)
    } else {
      const entry = asset.data.entries['0']
      assert.equal(entry.uid, 0)
      assert.deepEqual(entry.key, ['城'])
      assert.equal(entry.disable, false)
      assert.deepEqual(entry.characterFilter, { isExclude: false, names: [], tags: [] })
    }
    assert.equal(checkAssetFormat(asset).valid, true)
  }
})

test('cross-card/worldbook copies preserve trigger meaning, false, zero, null and unknown extensions', async () => {
  const source = await worldFixture()
  const raw = source.data.entries['1']
  Object.assign(raw, { position: 4, disable: true, order: 0, probability: 0, depth: 0, role: 0,
    selectiveLogic: 3, caseSensitive: null, scanDepth: null, groupOverride: false, delayUntilRecursion: 2,
    extensions: { vendor: { secret: 'keep' } }, extra: { untouched: true } })
  const original = snapshot(source)
  const target = createAsset('character')
  copyWorldbookEntries(source, target)
  const entry = target.data.data.character_book.entries[1]
  assertEmbedded(entry)
  assert.deepEqual(entry.keys, raw.key)
  assert.deepEqual(entry.secondary_keys, raw.keysecondary)
  assert.equal(entry.enabled, false)
  assert.equal(entry.insertion_order, 0)
  assert.equal(entry.extensions.position, 4)
  assert.equal(entry.extensions.probability, 0)
  assert.equal(entry.extensions.case_sensitive, null)
  assert.equal(entry.extensions.delay_until_recursion, 2)
  assert.deepEqual(entry.extensions.vendor, { secret: 'keep' })
  const back = createAsset('worldbook')
  copyWorldbookEntries(target, back)
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'extensions') for (const [extKey, extValue] of Object.entries(value)) assert.deepEqual(back.data.entries['1'].extensions[extKey], extValue, extKey)
    else assert.deepEqual(back.data.entries['1'][key], value, key)
  }
  assert.deepEqual(source, original)
})

test('legacy broken embedded object is repaired, with native edited aliases taking precedence', async () => {
  const asset = await cardFixture()
  const old = asset.data.data.character_book.entries[1]
  asset.data.data.character_book.entries = { 1: { ...old, uid: 1, key: ['新关键词'], order: 12, disable: true, position: 4, depth: 8 } }
  const report = checkAssetFormat(asset)
  assert.equal(report.valid, false)
  assert.equal(report.repairable, true)
  const fixed = repairedAssetData(asset)
  const entry = fixed.data.character_book.entries[0]
  assertEmbedded(entry)
  assert.deepEqual(entry.keys, ['新关键词'])
  assert.equal(entry.enabled, false)
  assert.equal(entry.insertion_order, 12)
  assert.equal(entry.extensions.position, 4)
  assert.equal(entry.extensions.depth, 8)
  assert.equal(entry.content, old.content)
})

test('worldbook arrays and embedded aliases normalize without erasing keywords', () => {
  const asset = createAsset('worldbook')
  asset.data.entries = [{ id: 5, keys: ['a,b'], content: 'text', enabled: false, insertion_order: 3, extensions: { position: 1 } }]
  const fixed = repairedAssetData(asset)
  assert.equal(Array.isArray(fixed.entries), false)
  assert.deepEqual(fixed.entries['5'].key, ['a,b'])
  assert.equal(fixed.entries['5'].disable, true)
  asset.data.entries = { 5: { keys: ['x'], content: 'text', enabled: true } }
  assert.deepEqual(repairedAssetData(asset).entries['5'].key, ['x'])
})

test('safe scalar repair preserves literal strings, unicode, zero and false', () => {
  const asset = createAsset('worldbook')
  asset.data.entries = { 0: { key: '完整,关键词', keysecondary: [], content: '正文😀', disable: 'false', constant: 'true', order: '0' } }
  const fixed = repairedAssetData(asset)
  assert.deepEqual(fixed.entries['0'].key, ['完整,关键词'])
  assert.equal(fixed.entries['0'].disable, false)
  assert.equal(fixed.entries['0'].constant, true)
  assert.equal(fixed.entries['0'].order, 0)
  assert.equal(fixed.entries['0'].content, '正文😀')
})

test('a broken single entry can be corrected with upsert without first repairing the whole book', async () => {
  const asset = await cardFixture()
  asset.data.data.character_book.entries[1].content = { broken: true }
  const bad = snapshot(asset)
  assert.throws(() => upsertWorldbookEntry(asset, '1', { keys: [], content: { stillBroken: true } }))
  assert.deepEqual(asset, bad)
  upsertWorldbookEntry(asset, '1', { keys: ['修正'], content: '修正后的正文' })
  assert.equal(checkAssetFormat(asset).valid, true)
  assert.equal(asset.data.data.character_book.entries[1].content, '修正后的正文')
})

test('CC case_sensitive is preserved when the ST extension is initially absent', () => {
  const card = createAsset('character')
  card.data.data.character_book = { entries: [{ id: 5, keys: ['Word'], content: 'text', enabled: true, insertion_order: 100, case_sensitive: true, extensions: {} }] }
  const fixed = repairedAssetData(card)
  assert.equal(fixed.data.character_book.entries[0].extensions.case_sensitive, true)
  assert.equal(fixed.data.character_book.entries[0].extensions.display_index, 5)
  assert.equal(convertWorldbook(fixed.data.character_book, 'worldbook').entries['5'].caseSensitive, true)
})

test('ambiguous corruption and duplicate IDs block repairs and exports without modifying source', async () => {
  const cases = [
    asset => { asset.data.data.description = { doNotErase: 'text' } },
    asset => { asset.data.data.tags = ['good', { unknown: true }] },
    asset => { asset.data.data.extensions = 'keep this broken extension' },
    asset => { asset.data.data.character_book.entries = 'keep this book' },
    asset => { asset.data.data.character_book.entries[1].content = { keep: true } },
    asset => { asset.data.data.character_book.entries[1].id = 0 },
    asset => { asset.data.data.character_book.entries[1].extensions.probability = 101 },
    asset => { asset.data.data.assets = [{ type: 'image', uri: 123, name: 'x', ext: 'png' }] },
  ]
  for (const corrupt of cases) {
    const asset = await cardFixture()
    corrupt(asset)
    const original = snapshot(asset)
    assert.equal(checkAssetFormat(asset).repairable, false)
    assert.throws(() => repairedAssetData(asset), /格式检查/)
    for (const format of ['v3', 'v2', 'png', 'charx']) assert.throws(() => exportAsset(asset, format), /格式检查/)
    assert.deepEqual(asset, original)
  }
})

test('schema defaults and legacy mirrors synchronize on export without changing unrelated metadata', async () => {
  const asset = await cardFixture()
  asset.data.data.name = '新名字'
  asset.data.data.description = '新描述'
  asset.data.vendor = { keep: 123 }
  asset.data.data.extensions.vendor = { opaque: true }
  const card = JSON.parse(Buffer.from(exportAsset(asset, 'v3').bytes).toString())
  assert.equal(card.name, card.data.name)
  assert.equal(card.description, card.data.description)
  assert.deepEqual(card.vendor, { keep: 123 })
  assert.deepEqual(card.data.extensions.vendor, { opaque: true })
  assert.equal(card.create_date, asset.data.create_date)
  assert.equal(card.avatar, 'none')
})

test('JSON V2/V3, PNG and CHARX exports preserve embedded books and opaque binary/text attachments', async () => {
  const asset = await cardFixture()
  asset.data.data.assets = [{ type: 'audio', uri: 'embeded://assets/theme.ogg', name: 'theme', ext: 'ogg' }]
  const binary = Uint8Array.from([0, 255, 128, 12])
  const text = Buffer.from('附件内容\n不要改写。')
  const imported = importAsset('test.charx', zipSync({ 'card.json': Buffer.from(JSON.stringify(asset.data)), 'assets/theme.ogg': binary, 'unknown/note.txt': text }))
  for (const format of ['v2', 'v3', 'png', 'charx']) {
    const file = exportAsset(imported, format)
    const round = importAsset(file.filename, file.bytes)
    assert.equal(checkAssetFormat(round).valid, true)
    assert.equal(Array.isArray(round.data.data.character_book.entries), true)
    round.data.data.character_book.entries.forEach(assertEmbedded)
    assert.equal(round.data.data.character_book.entries[1].content, asset.data.data.character_book.entries[1].content)
    if (format === 'charx') {
      const files = unzipSync(file.bytes)
      assert.deepEqual(files['assets/theme.ogg'], binary)
      assert.deepEqual(Buffer.from(files['unknown/note.txt']), text)
    }
    if (format === 'png') assert.deepEqual(Buffer.from(round.resources.find(v => v.path === 'assets/theme.ogg').dataBase64, 'base64'), Buffer.from(binary))
  }
})

test('actual client edit adapter keeps embedded arrays and advanced options after both pane edits', async () => {
  let registration
  Function('window', await readFile('dist/client.js', 'utf8'))({ __ModuleLoader__: { load: v => { registration = v } } })
  const ui = registration.factory(createRequire(import.meta.url))
  const asset = await cardFixture()
  const book = ui.embeddedBookAsset(asset)
  assert.deepEqual(book.data.entries['1'].key, ['主关键字1', 'key2'])
  assert.equal(book.data.entries['1'].position, 1)
  ui.editEmbeddedBook(asset, next => {
    next.data.entries['1'].key = ['人类编辑']
    next.data.entries['1'].disable = true
    next.data.entries['1'].depth = 7
    next.data.entries['1'].probability = 0
  })
  ui.editEmbeddedBook(asset, next => { next.data.entries['1'].content = '右侧编辑正文' })
  const entry = asset.data.data.character_book.entries[1]
  assertEmbedded(entry)
  assert.deepEqual(entry.keys, ['人类编辑'])
  assert.equal(entry.content, '右侧编辑正文')
  assert.equal(entry.enabled, false)
  assert.equal(entry.extensions.depth, 7)
  assert.equal(entry.extensions.probability, 0)
  assert.equal(entry.extensions.position, 1)
  ui.editEmbeddedBook(asset, next => { delete next.data.entries['0'] })
  assert.deepEqual(asset.data.data.character_book.entries.map(v => v.id), [1])
  assert.equal(checkAssetFormat(asset).valid, true)
})

test('HTTP save -> PNG export -> card importer preserves the repaired embedded structure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stcw-format-api-'))
  const store = new ProjectStore(root)
  const server = createServer(createApiHandler(store))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const project = await store.create()
    const asset = await cardFixture()
    await store.update(project.id, value => value.assets.push(asset))
    asset.data.data.character_book.entries = { 0: { key: ['修复'], content: '中文正文', position: 1 } }
    const base = `http://127.0.0.1:${server.address().port}/api/dsh-stcardwriter/projects/${project.id}/assets/${asset.id}`
    const save = await fetch(base, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ asset }) })
    assert.equal(save.status, 200)
    const exported = await fetch(base + '/export?format=png')
    assert.equal(exported.status, 200)
    const card = readCharacterFromPng(new Uint8Array(await exported.arrayBuffer()))
    assertEmbedded(card.data.character_book.entries[0])
    assert.deepEqual(card.data.character_book.entries[0].keys, ['修复'])
  } finally { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }) }
})

test('Agent validate/repair are lossless, paginated, dry-run by default, and refuse partial destructive saves', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stcw-format-tools-'))
  try {
    await build({ entryPoints: ['src/agent-tools.ts'], outfile: join(root, 'tools.mjs'), bundle: true, platform: 'node', format: 'esm',
      plugins: [{ name: 'tool-definition-fixture', setup(b) {
        b.onResolve({ filter: /^@deepseek-ai\/dsh-tools$/ }, () => ({ path: 'definition', namespace: 'fixture' }))
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const defineTool = value => value;' }))
      } }] })
    const { apply } = await import(pathToFileURL(join(root, 'tools.mjs')).href)
    const definitions = new Map()
    apply({ tools: { register: tool => { definitions.set(tool.name, tool); return () => {} } } })
    const store = new ProjectStore(join(root, '.tavernres', 'projects'))
    const project = await store.create()
    const asset = await cardFixture()
    asset.data.data.character_book.entries = { 0: { key: ['测试'], content: 'PRIVATE_BODY'.repeat(10000) } }
    asset.resources = [{ id: 'bin', path: 'x.bin', container: 'charx', dataBase64: 'AP+A' }]
    await store.update(project.id, value => value.assets.push(asset))
    const args = { projectId: project.id, assetId: asset.id, workspacePath: root, limit: 1 }
    const disk = await readFile(join(store.root, project.id + '.json'), 'utf8')
    const validate = await definitions.get('tavern_asset_validate').execute(args)
    assert.equal(validate.report.valid, false)
    assert.equal(validate.report.issues.length, 1)
    assert.equal(validate.report.hasMore, true)
    lossless(validate)
    const preview = await definitions.get('tavern_asset_repair').execute(args)
    assert.equal(preview.dryRun, true)
    assert.equal(preview.saved, false)
    assert.equal(preview.after.valid, true)
    assert.equal(await readFile(join(store.root, project.id + '.json'), 'utf8'), disk)
    assert.doesNotMatch(JSON.stringify(preview), /PRIVATE_BODY|AP\+A|dataBase64|pngBase64/)
    assert.ok(JSON.stringify(preview).length < 3000)
    lossless(preview)
    const fixed = await definitions.get('tavern_asset_repair').execute({ ...args, dryRun: false })
    assert.equal(fixed.saved, true)
    const loaded = (await store.get(project.id)).assets[0]
    assert.equal(loaded.resources[0].dataBase64, 'AP+A')
    assertEmbedded(loaded.data.data.character_book.entries[0])
    assert.equal((await definitions.get('tavern_asset_repair').execute({ ...args, dryRun: false })).saved, false)
    await store.update(project.id, value => { value.assets[0].data.data.description = { dontErase: true } })
    const corruptDisk = await readFile(join(store.root, project.id + '.json'), 'utf8')
    const blocked = await definitions.get('tavern_asset_repair').execute({ ...args, dryRun: false })
    assert.equal(blocked.canSave, false)
    assert.equal(blocked.saved, false)
    assert.equal(await readFile(join(store.root, project.id + '.json'), 'utf8'), corruptDisk)
    assert.equal(definitions.get('tavern_asset_validate').isConcurrencySafe(), true)
    assert.equal(definitions.get('tavern_asset_repair').isConcurrencySafe({ dryRun: false }), false)
  } finally { await rm(root, { recursive: true, force: true }) }
})
