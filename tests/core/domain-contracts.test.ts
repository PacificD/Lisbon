import { describe, expect, it } from 'vitest'

import {
  DraftPayloadSchema,
  DraftRecordSchema,
  SubscriberRecordSchema,
  ThemeRecordSchema,
  WorkflowResultSchema,
} from '../../packages/shared/src/schemas.ts'
import { loadConfig } from '../../packages/shared/src/config.ts'
import { NewsletterConfigSchema } from '../../packages/shared/src/types.ts'
import {
  approveDraft,
  assertCanSendDraft,
  createDraftRecord,
  createSubscriberRecord,
  createThemeRecord,
  getLatestApprovedDraft,
  getNextDraftVersion,
  markDraftFailed,
  markDraftSent,
} from '../../packages/core/src/index.ts'

describe('shared and core domain contracts', () => {
  it('loads config through the shared schema contract', () => {
    const parsed = NewsletterConfigSchema.parse({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      RESEND_API_KEY: 're_test_key',
      MAIL_FROM: 'Lisbon <news@example.com>',
      PREVIEW_OUTPUT_DIR: '.tmp/previews',
    })

    expect(parsed.DEFAULT_ISSUE_DATE_TIMEZONE).toBe('Asia/Shanghai')

    expect(
      loadConfig({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        RESEND_API_KEY: 're_test_key',
        MAIL_FROM: 'Lisbon <news@example.com>',
        PREVIEW_OUTPUT_DIR: '.tmp/previews',
      }),
    ).toEqual(parsed)
  })

  it('validates the shared persisted record and workflow shapes', () => {
    const theme = ThemeRecordSchema.parse({
      id: 'theme_tech',
      slug: 'tech',
      name: 'Tech',
      workflowName: 'tech-daily',
      enabled: true,
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    })

    const subscriber = SubscriberRecordSchema.parse({
      id: 'sub_1',
      themeId: theme.id,
      email: 'reader@example.com',
      createdAt: '2026-05-02T00:00:00.000Z',
    })

    const workflowResult = WorkflowResultSchema.parse({
      subject: 'Tech Daily',
      previewText: 'Top links for today',
      intro: 'A short summary.',
      items: [
        {
          title: 'Interesting link',
          source: 'Hacker News',
          url: 'https://example.com/story',
          summary: 'Why this matters.',
          tags: ['frontend'],
        },
      ],
    })

    const payload = DraftPayloadSchema.parse({
      theme,
      generatedAt: '2026-05-02T00:05:00.000Z',
      workflow: {
        name: 'tech-daily',
        displayName: 'Tech Daily',
        description: 'Daily tech newsletter',
      },
      result: workflowResult,
    })

    const draft = DraftRecordSchema.parse({
      id: 'draft_1',
      themeId: theme.id,
      issueDate: '2026-05-02',
      version: 1,
      status: 'draft',
      subject: workflowResult.subject,
      previewText: workflowResult.previewText,
      draftPayload: payload,
      renderedHtml: '<html><body>hello</body></html>',
      approvedAt: null,
      sentAt: null,
      sendProvider: null,
      providerMessageId: null,
      errorMessage: null,
      createdAt: '2026-05-02T00:05:00.000Z',
      updatedAt: '2026-05-02T00:05:00.000Z',
    })

    expect(theme.slug).toBe('tech')
    expect(subscriber.email).toBe('reader@example.com')
    expect(payload.result.items).toHaveLength(1)
    expect(draft.status).toBe('draft')
  })

  it('enforces the core draft lifecycle and selection rules', () => {
    const theme = createThemeRecord({
      id: 'theme_finance',
      slug: 'finance',
      name: 'Finance',
      workflowName: 'finance-daily',
      enabled: true,
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    })

    const draftPayload = DraftPayloadSchema.parse({
      theme,
      generatedAt: '2026-05-02T08:00:00.000Z',
      workflow: {
        name: 'finance-daily',
        displayName: 'Finance Daily',
        description: 'Daily finance newsletter',
      },
      result: {
        subject: 'Finance Daily',
        previewText: 'Markets and macro',
        intro: 'Today in finance.',
        items: [
          {
            title: 'Market update',
            source: 'Example',
            url: 'https://example.com/markets',
            summary: 'Stocks moved higher.',
          },
        ],
      },
    })

    const firstDraft = createDraftRecord({
      id: 'draft_1',
      themeId: theme.id,
      issueDate: '2026-05-02',
      version: 1,
      subject: 'Finance Daily',
      previewText: 'Markets and macro',
      draftPayload,
      renderedHtml: '<html></html>',
      createdAt: '2026-05-02T08:00:00.000Z',
      updatedAt: '2026-05-02T08:00:00.000Z',
    })
    const approvedDraft = approveDraft(firstDraft, '2026-05-02T08:30:00.000Z')

    expect(getNextDraftVersion([])).toBe(1)
    expect(getNextDraftVersion([firstDraft, approvedDraft])).toBe(2)
    expect(getLatestApprovedDraft([firstDraft, approvedDraft])?.id).toBe('draft_1')

    const sentDraft = markDraftSent(approvedDraft, {
      sentAt: '2026-05-02T09:00:00.000Z',
      sendProvider: 'resend',
      providerMessageId: 'msg_123',
    })

    expect(() =>
      assertCanSendDraft({
        targetDraft: approvedDraft,
        existingDrafts: [sentDraft],
      }),
    ).toThrow(/already been sent/i)

    const failedDraft = markDraftFailed(approvedDraft, 'provider timeout', '2026-05-02T09:15:00.000Z')

    expect(sentDraft.status).toBe('sent')
    expect(failedDraft.status).toBe('failed')
    expect(failedDraft.errorMessage).toBe('provider timeout')
  })

  it('creates subscriber records through the core contract', () => {
    const subscriber = createSubscriberRecord({
      id: 'sub_2',
      themeId: 'theme_finance',
      email: 'finance@example.com',
      createdAt: '2026-05-02T00:00:00.000Z',
    })

    expect(subscriber.email).toBe('finance@example.com')
  })
})
