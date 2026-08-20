import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from './store.js'

async function exists(path: string): Promise<boolean> {
  try { await readFile(path); return true } catch { return false }
}

export async function ensureAgentPreset(): Promise<{ installed: boolean; path: string }> {
  const destination = join(resolveDshHome(), '.agent-presets', 'tavern-authoring')
  const target = join(destination, 'agent.cordis.yml')
  if (await exists(target)) return { installed: false, path: destination }
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  const source = join(packageRoot, 'agent-presets', 'tavern-authoring')
  await mkdir(destination, { recursive: true })
  await Promise.all([
    copyFile(join(source, 'agent.cordis.yml'), target),
    copyFile(join(source, 'preset.yml'), join(destination, 'preset.yml')),
  ])
  return { installed: true, path: destination }
}
