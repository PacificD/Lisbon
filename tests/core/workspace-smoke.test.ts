import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('workspace scaffold', () => {
  it('matches the planned workspace contract', () => {
    expect(read('pnpm-workspace.yaml')).toContain('apps/*')
    expect(read('pnpm-workspace.yaml')).toContain('packages/*')
    expect(read('pnpm-workspace.yaml')).toContain('tests')

    const packageJson = JSON.parse(read('package.json')) as {
      name?: string
      private?: boolean
      packageManager?: string
      scripts?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    expect(packageJson.name).toBe('lisbon')
    expect(packageJson.private).toBe(true)
    expect(packageJson.packageManager).toBe('pnpm@10.0.0')
    expect(packageJson.scripts).toEqual({
      build: 'pnpm -r build',
      test: 'vitest run',
      'test:watch': 'vitest',
      typecheck: 'pnpm -r typecheck',
    })
    expect(packageJson.devDependencies).toEqual({
      '@types/node': '^24.0.0',
      tsx: '^4.20.0',
      typescript: '^5.9.0',
      vitest: '^3.2.0',
    })

    expect(read('tsconfig.base.json')).toContain('"strict": true')
    expect(read('vitest.workspace.ts')).toContain('defineWorkspace')
    expect(read('.env.example')).toContain('SUPABASE_URL=')
    expect(read('.env.example')).toContain('DEFAULT_ISSUE_DATE_TIMEZONE=Asia/Shanghai')
    expect(read('.gitignore')).toContain('.tmp')
    expect(read('.gitignore')).toContain('node_modules')
  })
})
