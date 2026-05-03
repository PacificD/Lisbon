import { Hono } from 'hono'

import { registerDraftRoutes } from './routes/drafts.js'
import { registerSendRoutes } from './routes/send.js'
import { registerSubscriberRoutes } from './routes/subscribers.js'
import { registerThemeRoutes } from './routes/themes.js'

export function createServerApp(runtime: {
  themeService?: unknown
  subscriberService?: unknown
  draftService?: unknown
  sendService?: unknown
} = {}) {
  const app = new Hono()

  app.get('/health', (context) => context.json({ ok: true }))

  registerThemeRoutes(app, runtime)
  registerSubscriberRoutes(app, runtime)
  registerDraftRoutes(app, runtime)
  registerSendRoutes(app, runtime)

  app.notFound((context) => context.json({ error: 'Not found.' }, 404))

  return app
}
