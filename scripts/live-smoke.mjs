import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { unzipSync, zipSync } from 'fflate'

const origin = process.argv[2]
if (!origin) throw new Error('usage: node scripts/live-smoke.mjs http://127.0.0.1:PORT')
const api = `${origin}/api/dsh-stcardwriter`
const workspacePath = process.cwd()
let projectId

async function request(path, init) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), 'x-dsh-workspace': encodeURIComponent(workspacePath), ...init?.headers },
  })
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`)
  return response
}

try {
  const home = await fetch(origin)
  if (!home.ok) throw new Error(`home: ${home.status}`)
  const client = await fetch(`${origin}/plugins/dsh-stcardwriter/client.js`)
  const clientText = await client.text()
  if (!client.ok || !clientText.includes('id: "dsh-stcardwriter"')) throw new Error('client bundle was not served by rc8 module host')

  const created = await (await request('/projects', { method: 'POST', body: JSON.stringify({ name: 'DSH rc8 冒烟测试' }) })).json()
  projectId = created.project.id
  let project = created.project
  for (const kind of ['character', 'worldbook', 'preset']) {
    project = (await (await request(`/projects/${projectId}/assets`, { method: 'POST', body: JSON.stringify({ kind, name: `空${kind}` }) })).json()).project
  }
  if (project.assets.length !== 3) throw new Error('blank asset creation count mismatch')

  const importedFiles = [
    {
      name: '中文角色.json',
      data: Buffer.from(JSON.stringify({ spec: 'chara_card_v3', spec_version: '3.0', data: {
        name: '中文角色', description: '冒烟测试', personality: '可靠', scenario: '酒馆', first_mes: '你好。', mes_example: '',
        creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [], group_only_greetings: [], tags: [], creator: '', character_version: '1', extensions: { smoke: true },
      } }), 'utf8').toString('base64'),
    },
    { name: '世界书.json', data: Buffer.from(JSON.stringify({ entries: { 0: { uid: 0, key: ['酒馆'], keysecondary: [], comment: '测试', content: '这里是一家酒馆。', constant: false, selective: false, order: 100, position: 0, disable: false } } }), 'utf8').toString('base64') },
    { name: '预设.json', data: Buffer.from(JSON.stringify({ name: '测试预设', prompts: [{ identifier: 'main', name: 'Main', role: 'system', content: '测试' }], prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }] }), 'utf8').toString('base64') },
    {
      name: '附属资源.charx',
      data: Buffer.from(zipSync({
        'card.json': Buffer.from(JSON.stringify({ spec: 'chara_card_v3', spec_version: '3.0', data: {
          name: '附属资源角色', description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
          creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [], group_only_greetings: [], tags: [], creator: '', character_version: '1', extensions: {},
          assets: [
            { type: 'document', name: '说明', uri: 'embeded://notes/readme.md', ext: 'md' },
            { type: 'icon', name: '内联图', uri: `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 0, 255]).toString('base64')}`, ext: 'png' },
          ],
        } })),
        'notes/readme.md': Buffer.from('# rc8 文本附件\n保真读取。\n'),
      })).toString('base64'),
    },
  ]
  const imported = await (await request(`/projects/${projectId}/import`, { method: 'POST', body: JSON.stringify({ files: importedFiles }) })).json()
  if (imported.imported !== 4 || imported.errors.length !== 0 || imported.project.assets.length !== 7) throw new Error('multi-import result mismatch')
  const importedCharacter = imported.project.assets.find(asset => asset.name === '中文角色')
  if (!importedCharacter) throw new Error('imported character missing')
  const resourceCharacter = imported.project.assets.find(asset => asset.name === '附属资源角色')
  if (!resourceCharacter) throw new Error('resource character missing')
  const persistedText = await readFile(join(workspacePath, '.tavernres', 'projects', `${projectId}.json`), 'utf8')
  if (/dataBase64|pngBase64|data:image\/png;base64/.test(persistedText)) throw new Error('project JSON still contains inline binary data')
  if (!persistedText.includes('tavernres-binary://') || !persistedText.includes('.assets/')) throw new Error('project JSON binary references missing')
  const charxResponse = await request(`/projects/${projectId}/assets/${resourceCharacter.id}/export?format=charx&workspace=${encodeURIComponent(workspacePath)}`)
  const charxFiles = unzipSync(new Uint8Array(await charxResponse.arrayBuffer()))
  if (Buffer.from(charxFiles['notes/readme.md']).toString() !== '# rc8 文本附件\n保真读取。\n') throw new Error('CHARX text attachment roundtrip failed')

  const png = await request(`/projects/${projectId}/assets/${importedCharacter.id}/export?format=png&workspace=${encodeURIComponent(workspacePath)}`)
  const pngBytes = new Uint8Array(await png.arrayBuffer())
  if (png.headers.get('content-type') !== 'image/png' || pngBytes[0] !== 137 || pngBytes[1] !== 80) throw new Error('PNG export invalid')
  const archive = await request(`/projects/${projectId}/export?workspace=${encodeURIComponent(workspacePath)}`)
  const archiveBytes = new Uint8Array(await archive.arrayBuffer())
  if (!archive.headers.get('content-type')?.includes('application/zip') || archiveBytes[0] !== 80 || archiveBytes[1] !== 75) throw new Error('project ZIP export invalid')

  console.log(JSON.stringify({
    host: origin,
    clientBundleBytes: clientText.length,
    blankAssets: 3,
    importedAssets: imported.imported,
    totalAssets: imported.project.assets.length,
    pngBytes: pngBytes.length,
    zipBytes: archiveBytes.length,
    binaryJsonExternalized: true,
    textAttachmentRoundtrip: true,
  }, null, 2))
} finally {
  if (projectId) await request(`/projects/${projectId}`, { method: 'DELETE' }).catch(error => console.error(`cleanup failed: ${error.message}`))
}
