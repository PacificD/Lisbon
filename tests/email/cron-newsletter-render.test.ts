import { describe, expect, it } from 'vitest'

import { renderCronNewsletterContent } from '../../packages/email/src/render.ts'

describe('cron newsletter email rendering', () => {
  it('renders controlled newsletter JSON as HTML and text', async () => {
    const rendered = await renderCronNewsletterContent({
      subject: '昨日美股收盘概览',
      previewText: '三大指数收跌，科技股承压。',
      intro: '以下为昨日美股收盘后的重点摘要。',
      sections: [
        {
          heading: '市场概览',
          paragraphs: ['标普 500 指数小幅回落，投资者继续评估利率路径。'],
          bullets: ['纳指弱于道指', '防御板块相对抗跌'],
        },
        {
          heading: '重点观察',
          paragraphs: ['大型科技股波动仍是盘面主线。'],
        },
      ],
    })

    expect(rendered.html.startsWith('<!DOCTYPE html')).toBe(true)
    expect(rendered.html).toContain('昨日美股收盘概览')
    expect(rendered.html).toContain('市场概览')
    expect(rendered.html).toContain('标普 500 指数小幅回落')
    expect(rendered.html).toContain('纳指弱于道指')
    expect(rendered.text).toContain('昨日美股收盘概览')
    expect(rendered.text).toContain('市场概览')
    expect(rendered.text).toContain('- 纳指弱于道指')
  })
})
