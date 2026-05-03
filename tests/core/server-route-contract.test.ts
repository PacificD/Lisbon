import { describe, expect, it } from 'vitest'

import { createServerApp } from '../../apps/server/src/app.ts'

describe('local server route shell', () => {
  it('registers the planned route surfaces with placeholder handlers', async () => {
    const app = createServerApp()

    const cases = [
      { method: 'GET', path: '/themes' },
      { method: 'POST', path: '/themes' },
      { method: 'PATCH', path: '/themes/tech' },
      { method: 'GET', path: '/themes/tech/subscribers' },
      { method: 'POST', path: '/themes/tech/subscribers' },
      { method: 'DELETE', path: '/themes/tech/subscribers/reader%40example.com' },
      { method: 'POST', path: '/drafts/generate' },
      { method: 'GET', path: '/drafts/tech/2026-05-02' },
      { method: 'GET', path: '/drafts/draft-1' },
      { method: 'POST', path: '/drafts/draft-1/approve' },
      { method: 'POST', path: '/send' },
    ] as const

    for (const testCase of cases) {
      const response = await app.request(testCase.path, {
        method: testCase.method,
      })

      expect(response.status, `${testCase.method} ${testCase.path}`).toBe(501)
      await expect(response.json()).resolves.toEqual({
        error: 'Not implemented.',
      })
    }
  })

  it('keeps unknown routes returning 404', async () => {
    const app = createServerApp()
    const response = await app.request('/missing')

    expect(response.status).toBe(404)
  })
})
