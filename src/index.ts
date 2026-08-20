import { createApiHandler, createWorkspaceStoreResolver, API_PREFIX } from './api.js'
import { ensureAgentPreset } from './preset.js'

interface WebServer {
  register(options: { kind: 'prefix'; path: string; handler: ReturnType<typeof createApiHandler> }): () => void
}
interface PluginContext {
  webServer: WebServer
  effect?(effect: () => void | (() => void), label?: string): void
}

export const inject = ['webServer']

export function apply(ctx: PluginContext): void {
  void ensureAgentPreset().catch(error => console.warn('[dsh-stcardwriter] Agent 预设安装失败:', error))
  const register = () => ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler: createApiHandler(createWorkspaceStoreResolver()) })
  if (ctx.effect) ctx.effect(register, 'dsh-stcardwriter: api')
  else register()
}

export { ProjectStore } from './store.js'
export { API_PREFIX, createApiHandler, createWorkspaceStoreResolver, workspacePathFromRequest } from './api.js'
export { ensureAgentPreset } from './preset.js'
export * from './format.js'
export * from './png.js'
export * from './types.js'
