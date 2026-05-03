import type { Hono } from 'hono'

export function registerSubscriberRoutes(app: Hono, _runtime: { subscriberService?: unknown }) {
  app.get('/themes/:themeSlug/subscribers', notImplemented)
  app.post('/themes/:themeSlug/subscribers', notImplemented)
  app.delete('/themes/:themeSlug/subscribers/:email', notImplemented)
}

function notImplemented(context: Parameters<Hono['get']>[1]) {
  return context.json({ error: 'Not implemented.' }, 501)
}
