import { describe, expect, it } from 'vitest'

import type { NewsletterConfig } from '@lisbon/shared'
import { workflowResultSchema } from '@lisbon/shared'

import { createWorkflowRegistry, frontendDailyWorkflow } from '../../packages/workflows/src/index.ts'

const config: NewsletterConfig = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  RESEND_API_KEY: 're_test_key',
  MAIL_FROM: 'Lisbon <news@example.com>',
  PREVIEW_OUTPUT_DIR: '.tmp/previews',
  DEFAULT_ISSUE_DATE_TIMEZONE: 'UTC',
}

describe('frontend daily workflow contract', () => {
  it('registers the frontend daily workflow and returns a valid workflow result', async () => {
    const registry = createWorkflowRegistry()
    const workflow = registry.getWorkflow(frontendDailyWorkflow.metadata.name)

    expect(workflow?.metadata).toEqual({
      name: 'frontend-daily',
      displayName: 'Frontend Daily',
      description: 'Curated frontend links for the daily Lisbon newsletter issue.',
    })

    const result = await workflow!.run({
      theme: {
        id: 'theme-frontend',
        slug: 'frontend',
        name: 'Frontend',
        workflowName: 'frontend-daily',
        enabled: true,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      issueDate: '2026-05-02',
      config,
    })

    expect(workflowResultSchema.parse(result)).toMatchObject({
      subject: 'Frontend Daily for 2026-05-02',
      previewText: 'Three frontend links worth reviewing today.',
      intro: 'A compact issue covering platform, tooling, and design system updates.',
    })
    expect(result.items).toHaveLength(3)
    expect(result.items.every((item) => item.source.length > 0)).toBe(true)
  })
})
