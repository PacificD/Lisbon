import { serve } from '@hono/node-server'

import { createServerApp } from './app.js'

const DEFAULT_PORT = 3000

export { createServerApp } from './app.js'

export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.PORT

  if (!value) {
    return DEFAULT_PORT
  }

  const port = Number.parseInt(value, 10)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer. Received: ${value}`)
  }

  return port
}

export function main(env: NodeJS.ProcessEnv = process.env): number {
  const port = resolvePort(env)
  const app = createServerApp()

  serve({
    fetch: app.fetch,
    port,
  })

  return port
}

const isEntryPoint = import.meta.url === new URL(process.argv[1], 'file:').href

if (isEntryPoint) {
  const port = main()
  process.stdout.write(`Lisbon server listening on http://localhost:${port}\n`)
}
