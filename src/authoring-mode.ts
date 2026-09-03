import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveDshHome } from './store.js'

export type AuthoringMode = 'standard' | 'minimal'

export interface ModeAgent {
  id: string
  status: 'idle' | 'running'
  ctx: { tools: { restrict(filter: { allow: string[] }): () => void } }
}

export interface ModeServices {
  agents: { get(id: string): ModeAgent | undefined }
  agentPresets: { composedPreset(context: unknown): string | undefined }
  tools: { schemas(agent: ModeAgent): { name: string }[] }
}

export interface AuthoringModeStatus {
  sessionId: string
  mode: AuthoringMode
  canSwitch: boolean
  toolCount: number
}

export class ModeError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

interface ModeState { mode: AuthoringMode; release?: () => void }

/** The preset stays mounted; only this agent's inherited tool catalog changes. */
export class AuthoringModeController {
  private states = new Map<ModeAgent, ModeState>()

  constructor(
    private readonly services: () => ModeServices | undefined,
    readonly root = join(resolveDshHome(), 'st-card-writer', 'session-modes'),
  ) {}

  private path(id: string): string {
    return join(this.root, `${createHash('sha256').update(id).digest('hex')}.json`)
  }

  private read(id: string): AuthoringMode {
    let raw: string
    try { raw = readFileSync(this.path(id), 'utf8') } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'standard'
      throw error
    }
    const value = JSON.parse(raw)
    if (value?.version !== 1 || value.sessionId !== id || !['standard', 'minimal'].includes(value.mode)) {
      throw new ModeError(500, '会话工具模式配置损坏，未修改当前工具配置')
    }
    return value.mode
  }

  private persist(id: string, mode: AuthoringMode): void {
    mkdirSync(this.root, { recursive: true })
    const temporary = join(this.root, `.${randomUUID()}.tmp`)
    try {
      writeFileSync(temporary, JSON.stringify({ version: 1, sessionId: id, mode }) + '\n', { encoding: 'utf8', flag: 'wx' })
      renameSync(temporary, this.path(id))
    } finally {
      rmSync(temporary, { force: true })
    }
  }

  private requireServices(): ModeServices {
    const services = this.services()
    if (!services) throw new ModeError(503, '当前 DSH 未提供按会话切换工具模式所需的服务')
    return services
  }

  private agent(id: string): ModeAgent {
    if (typeof id !== 'string' || !id.trim() || id.length > 256) throw new ModeError(400, '无效的会话 ID')
    const services = this.requireServices()
    const agent = services.agents.get(id)
    if (!agent) throw new ModeError(404, '当前对话尚未加载，请先打开该对话')
    if (services.agentPresets.composedPreset(agent.ctx) !== 'tavern-authoring') {
      throw new ModeError(409, '请在酒馆创作模式的对话中切换；其他 Agent 预设不受影响')
    }
    return agent
  }

  private restrict(agent: ModeAgent): () => void {
    const allow = this.requireServices().tools.schemas(agent).map(tool => tool.name)
      .filter(name => name.startsWith('tavern_') || name === 'ask_user_question' || name === 'exit_plan_mode')
    if (!allow.some(name => name.startsWith('tavern_'))) throw new ModeError(409, '酒馆工具尚未加载，暂时不能启用极简模式')
    return agent.ctx.tools.restrict({ allow })
  }

  private state(agent: ModeAgent): ModeState {
    let state = this.states.get(agent)
    if (!state) {
      const mode = this.read(agent.id)
      state = { mode, ...(mode === 'minimal' ? { release: this.restrict(agent) } : {}) }
      this.states.set(agent, state)
    }
    return state
  }

  get(id: string): AuthoringModeStatus {
    const agent = this.agent(id)
    // A UI poll after hot reload must not alter an in-flight request. The
    // assembly hook will restore the saved restriction at the next boundary.
    const state = this.states.get(agent) ?? (agent.status === 'running' ? { mode: this.read(id) } : this.state(agent))
    return { sessionId: agent.id, mode: state.mode, canSwitch: agent.status === 'idle', toolCount: this.requireServices().tools.schemas(agent).length }
  }

  set(id: string, mode: unknown): AuthoringModeStatus {
    if (mode !== 'standard' && mode !== 'minimal') throw new ModeError(400, 'mode 必须为 standard 或 minimal')
    const agent = this.agent(id)
    if (agent.status !== 'idle') throw new ModeError(409, 'Agent 正在回复，请等待回复结束后切换工具模式')
    const current = this.state(agent)
    if (current.mode === mode) return this.get(id)
    // No await between the idle check, persistence and registry update: a new
    // turn cannot start halfway through a human's switch.
    const release = mode === 'minimal' ? this.restrict(agent) : undefined
    try { this.persist(id, mode) } catch (error) { release?.(); throw error }
    current.release?.()
    this.states.set(agent, { mode, ...(release ? { release } : {}) })
    return this.get(id)
  }

  /** Restore before the model sees schemas, including existing agents after HMR. */
  filterAssembly<T extends { name: string }>(assembly: { tools: T[] }, agent?: ModeAgent): void {
    if (!agent) return
    const services = this.services()
    if (!services || services.agentPresets.composedPreset(agent.ctx) !== 'tavern-authoring') return
    if (this.state(agent).mode === 'minimal') {
      // The assembly may have been built just before the restore installed its
      // restriction. Intersect it; never add a tool another policy removed.
      const visible = new Set(services.tools.schemas(agent).map(tool => tool.name))
      assembly.tools = assembly.tools.filter(tool => visible.has(tool.name))
    }
  }

  forget(agent: ModeAgent): void {
    this.states.get(agent)?.release?.()
    this.states.delete(agent)
  }

  dispose(): void {
    for (const agent of this.states.keys()) this.forget(agent)
  }
}
