import { createApiHandler, createWorkspaceStoreResolver, API_PREFIX } from './api.js'
import { ensureAgentPreset } from './preset.js'

interface WebServer {
  register(options: { kind: 'prefix'; path: string; handler: ReturnType<typeof createApiHandler> }): () => void
}

interface PluginContext {
  webServer: WebServer
  get?(name: string): unknown
  on?(event: string, listener: (...args: any[]) => unknown, options?: { global?: boolean }): () => void
  effect?(effect: () => void | (() => void), label?: string): void
}

export const inject = ['webServer']

export const PRESET_PLUS_SCOPES = ['preset-plus', 'tavern-authoring'] as const

export function filterPresetPlusSection<T extends { name: string }>(sections: T[], presetId: string | undefined): T[] {
  return (PRESET_PLUS_SCOPES as readonly string[]).includes(presetId ?? '')
    ? sections
    : sections.filter(section => section.name !== 'preset-plus')
}

function installPresetPlusScopeGuard(ctx: PluginContext): void {
  const agentPresets = ctx.get?.('agentPresets') as { composedPreset(context: unknown): string } | undefined
  if (!agentPresets || !ctx.on) return
  ctx.on('system-prompt/assemble', (assembly: { sections: { name: string }[] }, context: { agent?: { ctx: unknown } }, next: () => unknown) => {
    const presetId = context.agent ? agentPresets.composedPreset(context.agent.ctx) : undefined
    assembly.sections = filterPresetPlusSection(assembly.sections, presetId)
    return next()
  }, { global: true })
}

export function apply(ctx: PluginContext): void {
  void ensureAgentPreset().catch(error => console.warn('[dsh-stcardwriter] Agent 预设安装失败:', error))
  const register = () => ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler: createApiHandler(createWorkspaceStoreResolver()) })
  if (ctx.effect) ctx.effect(register, 'dsh-stcardwriter: api')
  else register()
  installPresetPlusScopeGuard(ctx)
}

export { ProjectStore } from './store.js'
export { API_PREFIX, createApiHandler, createWorkspaceStoreResolver, workspacePathFromRequest } from './api.js'
export { ensureAgentPreset } from './preset.js'
export * from './connector.js'
export * from './format.js'
export * from './png.js'
export * from './preset-plus.js'
export * from './types.js'
