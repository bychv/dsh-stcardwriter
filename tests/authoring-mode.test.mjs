import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { AuthoringModeController, createApiHandler, filterPresetPlusSection } from '../dist/index.js'

function runtime() {
  const names = ['tavern_project_get', 'tavern_character_patch', 'tavern_preset_plus_write', 'ask_user_question', 'exit_plan_mode', 'pwsh', 'read_file', 'subagent', 'web_search']
  const agents = new Map()
  const make = (id, preset = 'tavern-authoring') => {
    const filters = new Set()
    const denied = new Set()
    const agent = { id, status: 'idle', filters, denied, ctx: { preset, tools: {
      restrict({ allow }) {
        const filter = new Set(allow)
        filters.add(filter)
        return () => { filters.delete(filter) }
      },
    } } }
    agents.set(id, agent)
    return agent
  }
  const services = {
    agents: { get: id => agents.get(id) },
    agentPresets: { composedPreset: ctx => ctx.preset },
    tools: { schemas: agent => names.filter(name => !agent.denied.has(name) && [...agent.filters].every(filter => filter.has(name))).map(name => ({ name })) },
  }
  return { make, services, names }
}

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'stcw-mode-'))
  const env = runtime()
  const controller = new AuthoringModeController(() => env.services, root)
  t.after(async () => { controller.dispose(); await rm(root, { recursive: true, force: true }) })
  return { ...env, root, controller }
}

test('human switches only the current conversation catalog and preserves other restrictions', async t => {
  const { controller, make, services, names } = await setup(t)
  const first = make('first'), second = make('second')
  first.denied.add('web_search')
  assert.equal(controller.get('first').mode, 'standard')
  const minimal = controller.set('first', 'minimal')
  assert.equal(minimal.mode, 'minimal')
  assert.equal(minimal.sessionId, 'first')
  assert.equal(minimal.toolCount, 5)
  assert.equal(first.filters.size, 1)
  controller.set('first', 'minimal')
  assert.equal(first.filters.size, 1)
  assert.deepEqual(services.tools.schemas(second).map(item => item.name), names)
  const assembly = { tools: names.map(name => ({ name })), sections: [{ name: 'preset-plus' }, { name: 'deployment:persona' }] }
  controller.filterAssembly(assembly, first)
  assert.deepEqual(assembly.tools.map(item => item.name), names.slice(0, 5))
  assert.deepEqual(filterPresetPlusSection(assembly.sections, first.ctx.preset), assembly.sections)
  controller.set('first', 'standard')
  assert.equal(first.filters.size, 0)
  assert.equal(services.tools.schemas(first).length, names.length - 1)
  assert.equal(services.tools.schemas(first).some(item => item.name === 'web_search'), false)
})

test('mode restores before schema delivery after reopen and HMR; it does not leak to another session', async t => {
  const { controller, make, services, root, names } = await setup(t)
  const agent = make('saved')
  controller.set(agent.id, 'minimal')
  controller.dispose()
  const restored = new AuthoringModeController(() => services, root)
  t.after(() => restored.dispose())
  const assembly = { tools: names.map(name => ({ name })) }
  agent.status = 'running'
  assert.equal(restored.get(agent.id).mode, 'minimal')
  assert.equal(agent.filters.size, 0, 'status polling must not alter an in-flight request after HMR')
  restored.filterAssembly(assembly, agent)
  assert.equal(assembly.tools.length, 5)
  assert.equal(restored.get(agent.id).mode, 'minimal')
  agent.status = 'idle'
  restored.forget(agent)
  assert.equal(agent.filters.size, 0)
  const reopened = make('saved')
  assert.equal(restored.get(reopened.id).mode, 'minimal')
  make('different')
  assert.equal(restored.get('different').mode, 'standard')
  restored.set('saved', 'standard')
  restored.forget(reopened)
  assert.equal(restored.get('saved').mode, 'standard')
})

test('running agents, other presets, unavailable services and invalid values cannot switch', async t => {
  const { controller, make, root } = await setup(t)
  const agent = make('busy')
  agent.status = 'running'
  assert.equal(controller.get(agent.id).canSwitch, false)
  assert.throws(() => controller.set(agent.id, 'minimal'), error => error.status === 409)
  make('foreign', 'preset-plus')
  assert.throws(() => controller.set('foreign', 'minimal'), error => error.status === 409)
  assert.throws(() => controller.get('missing'), error => error.status === 404)
  assert.throws(() => controller.set('busy', 'invalid'), error => error.status === 400)
  assert.throws(() => new AuthoringModeController(() => undefined, root).get('busy'), error => error.status === 503)
  assert.deepEqual(await readdir(root), [])
})

test('failed persistence rolls back new restriction and leaves the previous mode intact', async t => {
  const { controller, make, root, names } = await setup(t)
  const agent = make('write-failure')
  controller.get(agent.id)
  const destination = join(root, createHash('sha256').update(agent.id).digest('hex') + '.json')
  await mkdir(destination)
  assert.throws(() => controller.set(agent.id, 'minimal'))
  assert.equal(controller.get(agent.id).mode, 'standard')
  assert.equal(controller.get(agent.id).toolCount, names.length)
  assert.equal(agent.filters.size, 0)
  assert.equal((await readdir(root)).some(name => name.endsWith('.tmp')), false)
})

test('opaque session IDs never form paths, and corrupted saved mode is not silently overwritten', async t => {
  const { controller, make, root } = await setup(t)
  const agent = make('../outside')
  controller.set(agent.id, 'minimal')
  const files = await readdir(root)
  assert.match(files[0], /^[a-f0-9]{64}\.json$/)
  const destination = join(root, files[0])
  assert.equal(JSON.parse(await readFile(destination, 'utf8')).sessionId, '../outside')
  controller.forget(agent)
  await writeFile(destination, JSON.stringify({ version: 1, sessionId: agent.id, mode: 'unknown' }))
  assert.throws(() => controller.get(agent.id), error => error.status === 500)
  assert.equal(agent.filters.size, 0)
})

test('human mode HTTP endpoint works without a project, refuses busy switches and preserves session identity', async t => {
  const { controller, make } = await setup(t)
  const agent = make('http-session')
  const handler = createApiHandler(() => { throw new Error('mode must not access project files') }, controller)
  const server = createServer((req, res) => { void handler(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = `http://127.0.0.1:${server.address().port}/api/dsh-stcardwriter/sessions/http-session/mode`
  assert.equal((await (await fetch(url)).json()).mode, 'standard')
  const put = body => fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const changed = await put({ mode: 'minimal' })
  assert.equal(changed.status, 200)
  assert.equal((await changed.json()).sessionId, agent.id)
  agent.status = 'running'
  assert.equal((await put({ mode: 'standard' })).status, 409)
  assert.equal(controller.get(agent.id).mode, 'minimal')
  agent.status = 'idle'
  assert.equal((await put({ mode: 'wrong' })).status, 400)
  assert.equal((await fetch(url, { method: 'POST' })).status, 405)
  assert.equal((await put({ mode: 'standard' })).status, 200)
})

test('mode selector is a human UI control, not an Agent tool', async () => {
  const source = await readFile('src/client.tsx', 'utf8')
  assert.match(source, /aria-label="工具模式"/)
  assert.match(source, /key=\{currentSessionId \|\| 'no-session'\}/)
  assert.match(source, /disabled=\{!status\?\.canSwitch \|\| saving\}/)
  assert.match(source, /<option value="minimal">极简模式/)
  assert.doesNotMatch(await readFile('dist/agent-tools.js', 'utf8'), /tavern_mode_(?:get|set)/)
})
