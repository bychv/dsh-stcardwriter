import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'
import { ensureAgentPreset } from '../dist/index.js'

test('bundle and client manifests target the rc8 plugin loaders', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.exports['./client'], './dist/client.js')
  assert.equal(pkg.exports['./package.json'], './package.json')
  assert.equal(pkg.name, 'dsh-stcardwriter')
  assert.match(import.meta.resolve('dsh-stcardwriter/package.json'), /package\.json$/)
  assert.match(import.meta.resolve('dsh-stcardwriter/client'), /dist\/client\.js$|dist\\client\.js$/)
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-layout'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'))
  const client = await readFile('dist/client.js', 'utf8')
  assert.match(client, /window\.__ModuleLoader__\.load/)
  assert.match(client, /id: "dsh-stcardwriter"/)
  assert.doesNotMatch(client, /id: "dsh-stcardwriter\/client"/)
  assert.match(client, /shell\.overlay/)
  assert.match(client, /sidebar\.footer\.action/)
  assert.match(client, /conversation\.input\.left/)
  const clientSource = await readFile('src/client.tsx', 'utf8')
  assert.match(clientSource, /导入资源/)
  assert.match(clientSource, /导出当前资源/)
  assert.match(clientSource, /导出全部资源 ZIP/)
  assert.match(clientSource, /AI Harness 输入/)
  assert.match(clientSource, /迁移所选到当前角色卡/)
  let registration
  Function('window', client)({ __ModuleLoader__: { load(value) { registration = value } } })
  assert.equal(registration.id, 'dsh-stcardwriter')
  const clientExports = registration.factory(createRequire(import.meta.url))
  assert.equal(typeof clientExports.apply, 'function')
  assert.deepEqual(clientExports.inject, ['slots'])
})

test('Tavern authoring Agent preset is bundled', async () => {
  const preset = await readFile('agent-presets/tavern-authoring/preset.yml', 'utf8')
  const composition = await readFile('agent-presets/tavern-authoring/agent.cordis.yml', 'utf8')
  assert.match(preset, /酒馆创作模式/)
  assert.match(composition, /dsh-stcardwriter\/agent-tools/)
  assert.match(composition, /complete: true/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-pwsh/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-fs/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-web/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-subagent/)
  const tools = await readFile('dist/agent-tools.js', 'utf8')
  assert.match(tools, /tavern_character_resource_read/)
  assert.match(tools, /tavern_character_patch/)
  assert.match(tools, /tavern_worldbook_entries_copy/)
  assert.match(tools, /tavern_asset_get/)
})

test('first activation installs but never overwrites the Agent preset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-stcw-preset-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const first = await ensureAgentPreset()
    const second = await ensureAgentPreset()
    assert.equal(first.installed, true)
    assert.equal(second.installed, false)
    assert.match(await readFile(join(root, '.agent-presets', 'tavern-authoring', 'agent.cordis.yml'), 'utf8'), /tavern-tools/)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})
