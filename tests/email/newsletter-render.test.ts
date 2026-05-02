import { describe, expect, it } from 'vitest'

import { renderNewsletterContent } from '../../packages/email/src/render.ts'

describe('newsletter email rendering', () => {
  it('renders stable HTML and text for previews and sends', () => {
    const rendered = renderNewsletterContent({
      theme: {
        id: 'theme-frontend',
        slug: 'frontend',
        name: 'Frontend',
        workflowName: 'frontend-daily',
        enabled: true,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      result: {
        subject: 'Frontend Daily for 2026-05-02',
        previewText: 'Three frontend links worth reviewing today.',
        intro: 'A compact issue covering platform, tooling, and design system updates.',
        items: [
          {
            title: 'Shipping React compiler-friendly component APIs',
            source: 'React Notes',
            url: 'https://example.com/react-compiler-apis',
            summary: 'Small API constraints now can prevent expensive rewrites when compiler adoption expands.',
            author: 'Lisbon Editorial',
            publishedAt: '2026-05-02T07:30:00.000Z',
            tags: ['react', 'performance'],
          },
        ],
      },
    })

    expect(rendered.html).toContain('<!DOCTYPE html>')
    expect(rendered.html).toContain('data-newsletter-theme="frontend"')
    expect(rendered.html).toContain('Frontend Daily for 2026-05-02')
    expect(rendered.html).toContain('Shipping React compiler-friendly component APIs')
    expect(rendered.text).toContain('Frontend: Frontend Daily for 2026-05-02')
    expect(rendered.text).toContain('Tags: react, performance')
  })
})
