import { describe, expect, it } from 'vitest'

import { draftStatusSchema, loadConfig, workflowResultSchema } from '@lisbon/shared'

describe('shared contract schemas', () => {
  it('parses a valid workflow result', () => {
    const result = workflowResultSchema.parse({
      subject: 'Tech Daily',
      previewText: 'Top links for today',
      intro: 'A short summary.',
      items: [
        {
          title: 'Interesting link',
          source: 'Hacker News',
          url: 'https://example.com/story',
          summary: 'Why this matters.',
        },
      ],
    })

    expect(result.items).toHaveLength(1)
  })

  it('rejects invalid draft status values', () => {
    expect(() => draftStatusSchema.parse('queued')).toThrow()
  })

  it('accepts UTC in the shared config loader', () => {
    expect(
      loadConfig({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        RESEND_API_KEY: 're_test_key',
        MAIL_FROM: 'Lisbon <news@example.com>',
        PREVIEW_OUTPUT_DIR: '.tmp/previews',
        DEFAULT_ISSUE_DATE_TIMEZONE: 'UTC',
      }).DEFAULT_ISSUE_DATE_TIMEZONE,
    ).toBe('UTC')
  })
})
