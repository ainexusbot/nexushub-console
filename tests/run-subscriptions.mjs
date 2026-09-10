import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const output = fileURLToPath(new URL('./.subscriptions.test.mjs', import.meta.url))
try {
  await build({
    entryPoints: ['tests/subscriptions.test.jsx'],
    outfile: output,
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    define: { 'import.meta.env.VITE_API_BASE': JSON.stringify('http://test.invalid') },
  })
  const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally {
  await rm(output, { force: true })
}
