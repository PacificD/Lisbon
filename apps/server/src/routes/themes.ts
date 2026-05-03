import type { Hono } from 'hono'

export function registerThemeRoutes(app: Hono, _runtime: { themeService?: unknown }) {
  app.get('/themes', notImplemented)
  app.post('/themes', notImplemented)
  app.patch('/themes/:slug', notImplemented)
}

function notImplemented(context: Parameters<Hono['get']>[1]) {
  return context.json({ error: 'Not implemented.' }, 501)
}
