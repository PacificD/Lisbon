import { fileURLToPath } from 'node:url'
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'root',
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
    resolve: {
      alias: {
        '@lisbon/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
        '@lisbon/shared/config': fileURLToPath(new URL('./packages/shared/src/config.ts', import.meta.url)),
        '@lisbon/shared/types': fileURLToPath(new URL('./packages/shared/src/types.ts', import.meta.url)),
        '@lisbon/shared/schemas': fileURLToPath(new URL('./packages/shared/src/schemas.ts', import.meta.url)),
      },
    },
  },
])
