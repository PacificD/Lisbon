import { describe, expect, it } from 'vitest'

import { draftStatusSchema, workflowResultSchema } from '@lisbon/shared'

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
})
