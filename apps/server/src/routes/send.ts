import type { Hono } from 'hono'

export function registerSendRoutes(app: Hono) {
  app.post('/send', notImplemented)
}

function notImplemented(context: Parameters<Hono['post']>[1]) {
  return context.json({ error: 'Not implemented.' }, 501)
}
