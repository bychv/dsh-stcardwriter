import { build } from 'esbuild'

const shared = {
  bundle: true,
  sourcemap: true,
  target: 'node22',
  logLevel: 'info',
  legalComments: 'none',
}

await Promise.all([
  build({
    ...shared,
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
    platform: 'node',
    format: 'esm',
    external: ['@deepseek-ai/*'],
  }),
  build({
    ...shared,
    entryPoints: ['src/agent-tools.ts'],
    outfile: 'dist/agent-tools.js',
    platform: 'node',
    format: 'esm',
    external: ['@deepseek-ai/*'],
  }),
  build({
    ...shared,
    entryPoints: ['src/client.tsx'],
    outfile: 'dist/client.js',
    platform: 'browser',
    format: 'cjs',
    target: 'es2024',
    external: ['react', 'react/jsx-runtime'],
    banner: {
      js: 'window.__ModuleLoader__.load({ id: "dsh-stcardwriter", factory: (require) => { var module = { exports: {} }; var exports = module.exports;'
    },
    footer: { js: 'return module.exports; } });' },
  }),
])
