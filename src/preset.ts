import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from './store.js'

async function exists(path: string): Promise<boolean> {
  try { await readFile(path); return true } catch { return false }
}

const MANAGED_V2 = '# dsh-stcardwriter managed preset v2'
const MANAGED_V3 = '# dsh-stcardwriter managed preset v3'

export async function ensureAgentPreset(): Promise<{ installed: boolean; updated: boolean; path: string }> {
  const destination = join(resolveDshHome(), '.agent-presets', 'tavern-authoring')
  const target = join(destination, 'agent.cordis.yml')
  if (await exists(target)) {
    const current = await readFile(target, 'utf8')
    if (current.startsWith(MANAGED_V2) && current.includes('    complete: true')) {
      const migrated = current
        .replace(MANAGED_V2, MANAGED_V3)
        .replace('    complete: true', '    complete: false')
      await writeFile(target, migrated, 'utf8')
      return { installed: false, updated: true, path: destination }
    }
    return { installed: false, updated: false, path: destination }
  }
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  const source = join(packageRoot, 'agent-presets', 'tavern-authoring')
  await mkdir(destination, { recursive: true })
  await Promise.all([
    copyFile(join(source, 'agent.cordis.yml'), target),
    copyFile(join(source, 'preset.yml'), join(destination, 'preset.yml')),
  ])
  return { installed: true, updated: false, path: destination }
}
