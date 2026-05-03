import type { Hono } from 'hono'

export function registerDraftRoutes(app: Hono) {
  app.post('/drafts/generate', notImplemented)
  app.get('/drafts/:themeSlug/:issueDate', notImplemented)
  app.get('/drafts/:draftId', notImplemented)
  app.post('/drafts/:draftId/approve', notImplemented)
}

function notImplemented(context: Parameters<Hono['get']>[1]) {
  return context.json({ error: 'Not implemented.' }, 501)
}
