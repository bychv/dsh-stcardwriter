declare module '@deepseek-ai/dsh-tools' {
  export function defineTool<T extends Record<string, unknown>>(definition: T): T
}
