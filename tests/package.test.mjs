import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'
import { ensureAgentPreset, filterPresetPlusSection, PRESET_PLUS_SCOPES } from '../dist/index.js'

test('bundle and client manifests target the DSH plugin loaders', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.exports['./client'], './dist/client.js')
  assert.equal(pkg.exports['./package.json'], './package.json')
  assert.equal(pkg.name, 'dsh-stcardwriter')
  assert.equal(pkg.version, '0.5.2')
  assert.equal(pkg.dependencies['@rain-kl/dsh-preset-plus'], '0.1.5')
  const readme = await readFile('README.md', 'utf8')
  assert.ok(readme.includes(`当前插件版本：\`${pkg.version}\``))
  assert.ok(readme.includes(`dsh-stcardwriter-${pkg.version}.tgz`))
  const patch = await readFile('cordis.patch.yml', 'utf8')
  assert.match(patch, /name: '@rain-kl\/dsh-preset-plus'/)
  assert.match(patch, /scopedPresets: \["preset-plus", "tavern-authoring"\]/)
  assert.match(import.meta.resolve('dsh-stcardwriter/package.json'), /package\.json$/)
  assert.match(import.meta.resolve('dsh-stcardwriter/client'), /dist\/client\.js$|dist\\client\.js$/)
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-layout'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'))
  assert.ok(!pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-runtime'))
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
  assert.match(clientSource, /Preset Plus 预设注入/)
  assert.match(clientSource, /Preset Plus 注入预览/)
  assert.match(clientSource, /preset-plus-preset/)
  assert.match(clientSource, /世界书标题/)
  assert.match(clientSource, /绿色关键词已命中/)
  assert.match(clientSource, /次关键词条件未满足/)
  assert.match(clientSource, /stcw-keyword-row/)
  assert.doesNotMatch(clientSource, /DshSystemPromptPanel|\/system-prompt/)
  let registration
  Function('window', client)({ __ModuleLoader__: { load(value) { registration = value } } })
  assert.equal(registration.id, 'dsh-stcardwriter')
  const clientExports = registration.factory(createRequire(import.meta.url))
  assert.equal(typeof clientExports.apply, 'function')
  assert.deepEqual(clientExports.inject, ['slots'])
  assert.equal(clientExports.includesKeyword('The Castle gate', 'castle', false, true), true)
  assert.equal(clientExports.includesKeyword('A scatter plot', 'cat', false, true), false)
  const inspected = clientExports.inspectLoreEntries({
    id: 'book', kind: 'worldbook', format: 'worldbook', name: '测试世界书',
    data: { entries: {
      0: { comment: '夜城', key: ['城堡'], keysecondary: ['夜晚'], selective: true, selectiveLogic: 0, order: 20 },
      1: { comment: '非白日', key: ['城堡'], keysecondary: ['白天'], selective: true, selectiveLogic: 2, order: 10 },
      2: { comment: '禁用常驻', constant: true, disable: true, order: 30 },
    } },
  }, '夜晚抵达城堡')
  assert.deepEqual(inspected.map(item => [item.entry.comment, item.active, item.state]), [
    ['非白日', true, '已触发'],
    ['夜城', true, '已触发'],
    ['禁用常驻', false, '已禁用'],
  ])
  assert.deepEqual(inspected[1].primary, [{ keyword: '城堡', matched: true }])
  assert.deepEqual(inspected[1].secondary, [{ keyword: '夜晚', matched: true }])
})

test('Tavern authoring Agent preset is bundled', async () => {
  const preset = await readFile('agent-presets/tavern-authoring/preset.yml', 'utf8')
  const composition = await readFile('agent-presets/tavern-authoring/agent.cordis.yml', 'utf8')
  assert.match(preset, /酒馆创作模式/)
  assert.match(composition, /dsh-stcardwriter\/agent-tools/)
  assert.match(composition, /managed preset v4/)
  assert.match(composition, /complete: false/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-pwsh/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-fs/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-web/)
  assert.match(composition, /@deepseek-ai\/dsh-tool-subagent/)
  assert.match(composition, /@deepseek-ai\/dsh-command-goal/)
  assert.match(composition, /modelSelectionSettings: true/)
  assert.match(composition, /fetch: true/)
  const tools = await readFile('dist/agent-tools.js', 'utf8')
  assert.match(tools, /tavern_character_resource_read/)
  assert.match(tools, /tavern_character_patch/)
  assert.match(tools, /tavern_worldbook_entries_copy/)
  assert.match(tools, /tavern_preset_convert_to_preset_plus/)
  assert.match(tools, /tavern_preset_plus_write/)
  assert.doesNotMatch(tools, /name: "tavern_preset_to_preset_plus"/)
  assert.match(tools, /tavern_asset_get/)
  assert.doesNotMatch(tools, /tavern_dsh_system_prompt/)
})

test('Agent preset install migrates exact managed v2/v3 compositions without overwriting user content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-stcw-preset-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const first = await ensureAgentPreset()
    const second = await ensureAgentPreset()
    assert.equal(first.installed, true)
    assert.equal(first.updated, false)
    assert.equal(second.installed, false)
    assert.equal(second.updated, false)
    const target = join(root, '.agent-presets', 'tavern-authoring', 'agent.cordis.yml')
    const v4 = (await readFile(target, 'utf8')).replace(/\r\n/g, '\n')
    assert.match(v4, /managed preset v4/)
    assert.match(v4, /tavern-tools/)
    const v3 = v4
      .replace('managed preset v4', 'managed preset v3')
      .replace('DSH 0.1.1-rc.2 / 0.1.2-alpha.3', 'DSH 0.1.1-rc.2')
      .replace("\n- id: command-goal\n  name: '@deepseek-ai/dsh-command-goal'\n", '')
      .replace('        modelSelectionSettings: true\n', '')
      .replace('    fetch: true', '    fetch: false')
    await writeFile(target, v3, 'utf8')
    const migrated = await ensureAgentPreset()
    assert.equal(migrated.updated, true)
    const result = await readFile(target, 'utf8')
    assert.match(result, /managed preset v4/)
    assert.match(result, /complete: false/)
    await writeFile(target, v3.replace('managed preset v3', 'managed preset v2').replace('complete: false', 'complete: true'), 'utf8')
    assert.equal((await ensureAgentPreset()).updated, true)
    await writeFile(target, `${v3}\n# user change\n`, 'utf8')
    assert.equal((await ensureAgentPreset()).updated, false)
    assert.match(await readFile(target, 'utf8'), /# user change/)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})

test('Preset Plus system section is retained only in compatible modes', () => {
  const sections = [{ name: 'deployment:persona' }, { name: 'preset-plus' }, { name: 'tools' }]
  assert.deepEqual(PRESET_PLUS_SCOPES, ['preset-plus', 'tavern-authoring'])
  assert.deepEqual(filterPresetPlusSection(sections, 'tavern-authoring'), sections)
  assert.deepEqual(filterPresetPlusSection(sections, 'preset-plus'), sections)
  assert.deepEqual(filterPresetPlusSection(sections, 'standard').map(section => section.name), ['deployment:persona', 'tools'])
  assert.deepEqual(filterPresetPlusSection(sections, undefined).map(section => section.name), ['deployment:persona', 'tools'])
})
