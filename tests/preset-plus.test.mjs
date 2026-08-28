import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { convertTavernPresetToPresetPlus, createAsset, detectKind, installPresetPlusPreset, presetPlusPresetFromAsset } from '../dist/index.js'

test('converts ordered SillyTavern chat-completion prompts to Preset Plus entries', () => {
  const asset = createAsset('preset', '写作预设')
  asset.data = {
    name: '写作预设',
    prompts: [
      { identifier: 'main', role: 'system', content: 'Main' },
      { identifier: 'marker', marker: true },
      { identifier: 'user', role: 'user', content: 'User' },
      { identifier: 'unused', role: 'assistant', content: 'Unused' },
    ],
    prompt_order: [{ character_id: 100001, order: [
      { identifier: 'user', enabled: false },
      { identifier: 'main', enabled: true },
      { identifier: 'marker', enabled: true },
   ] }],
    assistant_prefill: 'Prefill',
  }
  const result = convertTavernPresetToPresetPlus(asset)
  assert.equal(result.preset.id, '写作预设')
  assert.deepEqual(result.preset.entries, [
    { role: 'system', text: '', enabled: true },
    { role: 'user', text: 'User', enabled: false },
    { role: 'system', text: 'Main', enabled: true },
    { role: 'assistant', text: 'Unused', enabled: false },
    { role: 'assistant', text: 'Prefill', enabled: true },
  ])
  assert.equal(result.skipped[0].identifier, 'marker')
  assert.equal(result.warnings.length, 1)
})

test('converts a SillyTavern system prompt preset', () => {
  const asset = createAsset('preset', 'Writer')
  asset.format = 'unknown-preset'
  asset.data = { name: 'Writer', content: 'Write vividly.', post_history: 'Stay in character.' }
  const result = convertTavernPresetToPresetPlus(asset, { autoMode: false })
  assert.equal(result.preset.autoMode, false)
  assert.deepEqual(result.preset.entries.map(entry => entry.text), ['Write vividly.', 'Stay in character.'])
})

test('recognizes, validates and normalizes an editable Preset Plus preview asset', () => {
  const data = { id: 'Writer Draft', name: 'Writer', autoMode: false, entries: [
    { role: 'system', text: 'System', enabled: true },
    { role: 'user', text: 'User', enabled: false },
  ] }
  assert.deepEqual(detectKind(data), { kind: 'preset', format: 'preset-plus-preset' })
  assert.deepEqual(detectKind({ entries: [] }), { kind: 'worldbook', format: 'worldbook' })
  const asset = createAsset('preset', 'Writer')
  asset.format = 'preset-plus-preset'
  asset.data = data
  assert.deepEqual(presetPlusPresetFromAsset(asset), {
    id: 'writer-draft', name: 'Writer', autoMode: false, entries: [
      { role: 'system', text: 'System', enabled: true },
      { role: 'user', text: 'User', enabled: false },
    ],
  })
  asset.data.entries[0].role = 'user'
  assert.throws(() => presetPlusPresetFromAsset(asset), /第一条必须是 system/)
})

test('installs converted presets without damaging existing Preset Plus presets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stcw-preset-plus-'))
  const path = join(root, 'preset-plus.json')
  await writeFile(path, JSON.stringify({ version: 1, activePresetId: 'existing', presets: {
    existing: { id: 'existing', name: 'Existing', autoMode: true, entries: [{ role: 'system', text: 'Keep', enabled: true }] },
  } }), 'utf8')
  const preset = { id: 'existing', name: 'Imported', autoMode: true, entries: [{ role: 'system', text: 'New', enabled: true }] }
  try {
    await assert.rejects(() => installPresetPlusPreset(preset, { dshHome: root }), /已存在/)
    const renamed = await installPresetPlusPreset(preset, { dshHome: root, conflict: 'rename', activate: true })
    assert.equal(renamed.id, 'existing-2')
    const saved = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(saved.presets.existing.entries[0].text, 'Keep')
    assert.equal(saved.presets['existing-2'].entries[0].text, 'New')
    assert.equal(saved.activePresetId, 'existing-2')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
