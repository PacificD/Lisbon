import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'root',
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  },
])
