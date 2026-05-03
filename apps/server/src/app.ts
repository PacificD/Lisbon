import { Hono } from 'hono'

import { registerDraftRoutes } from './routes/drafts.js'
import { registerSendRoutes } from './routes/send.js'
import { registerSubscriberRoutes } from './routes/subscribers.js'
import { registerThemeRoutes } from './routes/themes.js'

export function createServerApp() {
  const app = new Hono()

  registerThemeRoutes(app)
  registerSubscriberRoutes(app)
  registerDraftRoutes(app)
  registerSendRoutes(app)

  app.notFound((context) => context.json({ error: 'Not found.' }, 404))

  return app
}
