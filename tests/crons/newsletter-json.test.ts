import { describe, expect, it } from 'vitest'

import { parseNewsletterJson, newsletterJsonSchema } from '../../apps/crons/src/newsletter-json.ts'

describe('newsletter JSON validation', () => {
  it('accepts sections with paragraphs and bullets', () => {
    const content = newsletterJsonSchema.parse({
      subject: '昨日美股收盘概览',
      previewText: '三大指数收跌。',
      intro: '以下为重点摘要。',
      sections: [
        {
          heading: '市场概览',
          paragraphs: ['标普 500 指数回落。'],
          bullets: ['科技股承压'],
        },
      ],
    })

    expect(content.sections[0]?.heading).toBe('市场概览')
  })

  it('rejects sections without paragraphs or bullets', () => {
    expect(() =>
      newsletterJsonSchema.parse({
        subject: '昨日美股收盘概览',
        previewText: '三大指数收跌。',
        intro: '以下为重点摘要。',
        sections: [{ heading: '空章节' }],
      }),
    ).toThrow()
  })

  it('parses strict JSON output from Codex', () => {
    const content = parseNewsletterJson(
      JSON.stringify({
        subject: '昨日美股收盘概览',
        previewText: '三大指数收跌。',
        intro: '以下为重点摘要。',
        sections: [{ heading: '市场概览', paragraphs: ['标普 500 指数回落。'] }],
      }),
    )

    expect(content.subject).toBe('昨日美股收盘概览')
  })

  it('rejects prose outside JSON', () => {
    expect(() => parseNewsletterJson('Here is JSON: {"subject":"x"}')).toThrow('Codex output was not valid JSON')
  })
})
