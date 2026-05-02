import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('workspace scaffold', () => {
  it('declares the pnpm workspace and base config files', () => {
    expect(read('pnpm-workspace.yaml')).toContain('apps/*')
    expect(read('pnpm-workspace.yaml')).toContain('packages/*')

    const packageJson = JSON.parse(read('package.json')) as {
      private?: boolean
      packageManager?: string
      scripts?: Record<string, string>
    }

    expect(packageJson.private).toBe(true)
    expect(packageJson.packageManager).toBe('pnpm@8.15.9')
    expect(packageJson.scripts?.test).toBe('vitest run')

    expect(read('tsconfig.base.json')).toContain('"strict": true')
    expect(read('vitest.workspace.ts')).toContain('defineWorkspace')
    expect(read('.env.example')).toContain('SUPABASE_URL=')
    expect(read('.gitignore')).toContain('node_modules')
  })
})
