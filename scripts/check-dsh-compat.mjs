import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshRoot = resolve(projectRoot, process.argv[2] ?? '.npm-cache/dsh-0.1.2-src')

async function text(root, relative) {
  return readFile(join(root, ...relative.split('/')), 'utf8')
}

async function json(root, relative) {
  return JSON.parse(await text(root, relative))
}

async function collectPackageNames(root) {
  const names = new Set()
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.name === 'package.json') {
        const pkg = JSON.parse(await readFile(path, 'utf8'))
        if (typeof pkg.name === 'string') names.add(pkg.name)
      }
    }
  }
  await visit(join(root, 'packages'))
  return names
}

const dshCli = await json(dshRoot, 'apps/cli/package.json')
assert.match(dshCli.version, /^0\.1\.2(?:-|$)/, '源码目录必须是 DSH 0.1.2')

const plugin = await json(projectRoot, 'package.json')
assert.equal(plugin.dsh.client.platform, 'web')
assert.ok(!plugin.dsh.client.inject.includes('@deepseek-ai/dsh-client-runtime'), '0.1.2 已删除 dsh-client-runtime')

const clientPackages = {
  '@deepseek-ai/dsh-client-ui-layout': 'packages/client/ui-layout/package.json',
  '@deepseek-ai/dsh-client-ui-sidebar': 'packages/client/ui-sidebar/package.json',
  '@deepseek-ai/dsh-client-ui-conversation': 'packages/client/ui-conversation/package.json',
}
for (const [name, path] of Object.entries(clientPackages)) {
  assert.equal((await json(dshRoot, path)).name, name)
  assert.ok(plugin.dsh.client.inject.includes(name), '插件清单缺少 ' + name)
}

const layout = await text(dshRoot, 'packages/client/ui-layout/src/client/index.ts')
const sidebar = await text(dshRoot, 'packages/client/ui-sidebar/src/client/index.ts')
const conversation = await text(dshRoot, 'packages/client/ui-conversation/src/client/apply.ts')
assert.match(layout, /'shell\.overlay'/)
assert.match(sidebar, /'sidebar\.footer\.action'/)
assert.match(conversation, /'conversation\.input\.left'/)

const pluginClient = await text(projectRoot, 'src/client.tsx')
for (const slot of ['shell.overlay', 'sidebar.footer.action', 'conversation.input.left']) {
  assert.match(pluginClient, new RegExp("slots\\.inject\\('" + slot.replaceAll('.', '\\.') + "'"))
}

const webServer = await text(dshRoot, 'packages/host/webserver/src/index.ts')
assert.match(webServer, /register\(route: WebRoute\): \(\) => void/)
assert.match(webServer, /export type WebRouteKind = 'exact' \| 'prefix'/)

const tools = await text(dshRoot, 'packages/core/tools/src/index.ts')
const toolSchema = await text(dshRoot, 'packages/core/tools/src/schema.ts')
assert.match(tools, /defineTool/)
assert.match(tools, /lossless-JSON/)
assert.match(toolSchema, /type: 'json'/)

const discovery = await text(dshRoot, 'packages/preset/agent-presets/src/discovery.ts')
assert.match(discovery, /USER_PRESET_DIR = '\.agent-presets'/)

const agentPresets = await text(dshRoot, 'packages/preset/agent-presets/src/index.ts')
const llm = await text(dshRoot, 'packages/llm/llm/src/index.ts')
const agents = await text(dshRoot, 'packages/core/agent/src/index.ts')
assert.match(agentPresets, /composedPreset\(agentCtx: Context\): string \| undefined/)
assert.match(llm, /'llm\/stream'\(this: LlmRuntime, options: GenerateOptions/)
assert.match(agents, /get\(id: SessionId\): Agent \| undefined/)

const packageNames = await collectPackageNames(dshRoot)
const composition = await text(projectRoot, 'agent-presets/tavern-authoring/agent.cordis.yml')
const requested = [...composition.matchAll(/^\s*name: '(@deepseek-ai\/[^']+)'/gm)].map(match => match[1])
const requestedRoots = [...new Set(requested.map(name => name.split('/').slice(0, 2).join('/')))]
for (const name of requestedRoots) assert.ok(packageNames.has(name), 'DSH 0.1.2 源码缺少 Agent 预设包 ' + name)

const presetPlusPath = fileURLToPath(import.meta.resolve('@rain-kl/dsh-preset-plus/package.json'))
const presetPlusRoot = dirname(presetPlusPath)
const presetPlus = JSON.parse(await readFile(presetPlusPath, 'utf8'))
assert.equal(presetPlus.version, plugin.dependencies['@rain-kl/dsh-preset-plus'])
const presetPlusClient = await readFile(join(presetPlusRoot, 'client.js'), 'utf8')
assert.match(presetPlusClient, /inject\s*=\s*\["slots"\]/)
assert.match(presetPlusClient, /slots\.inject\("settings\.section"/)

const presetPlusHost = await readFile(join(presetPlusRoot, 'lib', 'index.js'), 'utf8')
assert.match(presetPlusHost, /inject\s*=\s*\["systemPrompt", "tools", "llm", "agents"\]/)
assert.match(presetPlusHost, /ctx\.on\("llm\/stream"/)
assert.match(presetPlusHost, /agents\.get\(sessionId\)/)
assert.match(presetPlusHost, /agentPresets\.composedPreset\(agent\.ctx\)/)
assert.match(presetPlusHost, /const mutableOptions = \{\s*\.\.\.options/s)
assert.match(presetPlusHost, /host\.webServer\.register\(\{\s*kind: "exact"/s)

const cordis = await json(dshRoot, 'vendor/cordis/package.json')
assert.equal(presetPlus.peerDependencies?.['@deepseek-ai/cordis'], '^4.0.1')
assert.equal(cordis.version, '4.0.2')

// Preset Plus 0.1.5 still lists the removed runtime as a package edge. In
// DSH 0.1.2 these dsh.client.inject edges are informational; actual activation
// waits on the browser plugin's exported Cordis service injection (slots).
if (presetPlus.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-runtime')) {
  const clientRules = await text(dshRoot, 'packages/client/AGENTS.md')
  assert.match(clientRules, /inject.*informational only/i)
}

console.log('OK dsh-stcardwriter ' + plugin.version + ' <-> DSH ' + dshCli.version)
console.log('OK ' + requestedRoots.length + ' Agent-plane packages, host APIs, and 3 UI slot contracts')
console.log('OK Preset Plus ' + presetPlus.version + ' browser + host contracts on Cordis ' + cordis.version)
