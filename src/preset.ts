import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from './store.js'

async function exists(path: string): Promise<boolean> {
  try { await readFile(path); return true } catch { return false }
}

const MANAGED_V2 = '# dsh-stcardwriter managed preset v2'
const MANAGED_V3 = '# dsh-stcardwriter managed preset v3'
const MANAGED_V3_SHA256 = '21402e1664557908b658169a1d24c2194f94c8d49a5c9ebca9d0ad7dfd11f353'

function normalizedSha256(value: string): string {
  return createHash('sha256').update(value.replace(/\r\n/g, '\n')).digest('hex')
}

function packagePresetRoot(): string {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  return join(packageRoot, 'agent-presets', 'tavern-authoring')
}

export async function ensureAgentPreset(): Promise<{ installed: boolean; updated: boolean; path: string }> {
  const destination = join(resolveDshHome(), '.agent-presets', 'tavern-authoring')
  const target = join(destination, 'agent.cordis.yml')
  if (await exists(target)) {
    const current = await readFile(target, 'utf8')
    const v3Candidate = current.startsWith(MANAGED_V2) && current.includes('    complete: true')
      ? current
        .replace(MANAGED_V2, MANAGED_V3)
        .replace('    complete: true', '    complete: false')
      : current
    if (v3Candidate.startsWith(MANAGED_V3) && normalizedSha256(v3Candidate) === MANAGED_V3_SHA256) {
      await copyFile(join(packagePresetRoot(), 'agent.cordis.yml'), target)
      return { installed: false, updated: true, path: destination }
    }
    return { installed: false, updated: false, path: destination }
  }
  const source = packagePresetRoot()
  await mkdir(destination, { recursive: true })
  await Promise.all([
    copyFile(join(source, 'agent.cordis.yml'), target),
    copyFile(join(source, 'preset.yml'), join(destination, 'preset.yml')),
  ])
  return { installed: true, updated: false, path: destination }
}
