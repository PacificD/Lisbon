import { describe, expect, it } from 'vitest'

import type { NewsletterConfig, WorkflowResult } from '@lisbon/shared'

import {
  createDraftService,
  createSendService,
  getNextDraftVersion,
  selectLatestApprovedDraft,
} from '../../packages/core/src/index.ts'
import type {
  DraftRenderer,
  DraftRepository,
  NewsletterDraft,
  Theme,
  ThemeRepository,
  WorkflowRegistry,
  WorkflowRunner,
} from '../../packages/core/src/index.ts'

const config: NewsletterConfig = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  RESEND_API_KEY: 're_test_key',
  MAIL_FROM: 'Lisbon <news@example.com>',
  PREVIEW_OUTPUT_DIR: '.tmp/previews',
  DEFAULT_ISSUE_DATE_TIMEZONE: 'UTC',
}

const theme: Theme = {
  id: 'theme-tech',
  slug: 'tech',
  name: 'Tech',
  workflowName: 'tech-daily',
  enabled: true,
  createdAt: '2026-05-02T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
}

const workflowResult: WorkflowResult = {
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
}

describe('core draft helpers and services', () => {
  it('computes the next version and picks the latest approved draft', () => {
    const drafts = [
      makeDraft({ id: 'draft-1', version: 1, status: 'draft' }),
      makeDraft({ id: 'draft-2', version: 2, status: 'approved' }),
      makeDraft({ id: 'draft-3', version: 3, status: 'failed' }),
      makeDraft({ id: 'draft-4', version: 4, status: 'approved' }),
    ]

    expect(getNextDraftVersion(drafts)).toBe(5)
    expect(selectLatestApprovedDraft(drafts)?.id).toBe('draft-4')
  })

  it('generates a new draft with the next version and approves it', async () => {
    const existingDrafts = [
      makeDraft({ id: 'draft-1', version: 1, status: 'draft' }),
      makeDraft({ id: 'draft-2', version: 2, status: 'approved' }),
    ]

    const draftRepository = createDraftRepository(existingDrafts)
    const service = createDraftService({
      config,
      draftRenderer: {
        render: ({ theme: currentTheme, result }) =>
          `<article data-theme="${currentTheme.slug}">${result.subject}</article>`,
      },
      draftRepository,
      themeRepository: {
        async create() {
          throw new Error('not used in test')
        },
        async findBySlug(slug) {
          return slug === theme.slug ? theme : null
        },
        async list() {
          return [theme]
        },
        async update() {
          throw new Error('not used in test')
        },
      },
      workflowRegistry: createWorkflowRegistry({
        metadata: {
          name: theme.workflowName,
          displayName: 'Tech Daily',
          description: 'Daily tech links',
        },
        async run() {
          return workflowResult
        },
      }),
    })

    const generated = await service.generateDraft({
      themeSlug: theme.slug,
      issueDate: '2026-05-02',
      now: '2026-05-02T08:00:00.000Z',
    })

    expect(generated.version).toBe(3)
    expect(generated.status).toBe('draft')
    expect(generated.subject).toBe(workflowResult.subject)
    expect(generated.renderedHtml).toContain('Tech Daily')

    const approved = await service.approveDraft({
      draftId: generated.id,
      now: '2026-05-02T09:00:00.000Z',
    })

    expect(approved.status).toBe('approved')
    expect(approved.approvedAt).toBe('2026-05-02T09:00:00.000Z')
    expect(draftRepository.records.at(-1)?.status).toBe('approved')
  })

  it('rejects sending when an issue for the same theme and date was already sent', async () => {
    let sendCalls = 0
    const draftRepository = createDraftRepository([
      makeDraft({ id: 'draft-1', version: 1, status: 'approved', approvedAt: '2026-05-02T08:00:00.000Z' }),
      makeDraft({
        id: 'draft-2',
        version: 2,
        status: 'sent',
        approvedAt: '2026-05-02T09:00:00.000Z',
        sentAt: '2026-05-02T10:00:00.000Z',
        sendProvider: 'resend',
        providerMessageId: 'msg-1',
      }),
    ])

    const service = createSendService({
      config,
      draftRepository,
      emailSender: {
        async send() {
          sendCalls += 1
          return { providerMessageId: 'msg-2' }
        },
      },
      subscriberRepository: {
        async add() {
          throw new Error('not used in test')
        },
        async listByTheme() {
          return [{ id: 'subscriber-1', themeId: theme.id, email: 'reader@example.com', createdAt: '2026-05-02T00:00:00.000Z' }]
        },
        async remove() {
          throw new Error('not used in test')
        },
      },
      themeRepository: {
        async create() {
          throw new Error('not used in test')
        },
        async findBySlug(slug) {
          return slug === theme.slug ? theme : null
        },
        async list() {
          return [theme]
        },
        async update() {
          throw new Error('not used in test')
        },
      },
    })

    await expect(
      service.sendIssue({
        themeSlug: theme.slug,
        issueDate: '2026-05-02',
        now: '2026-05-02T11:00:00.000Z',
      }),
    ).rejects.toThrow('already been sent')

    expect(sendCalls).toBe(0)
  })
})

function createDraftRepository(initialDrafts: NewsletterDraft[]): DraftRepository & {
  records: NewsletterDraft[]
} {
  const records = [...initialDrafts]

  return {
    records,
    async create(draft) {
      records.push(draft)
      return draft
    },
    async listByThemeAndIssueDate(themeId, issueDate) {
      return records.filter((draft) => draft.themeId === themeId && draft.issueDate === issueDate)
    },
    async findById(id) {
      return records.find((draft) => draft.id === id) ?? null
    },
    async update(updatedDraft) {
      const index = records.findIndex((draft) => draft.id === updatedDraft.id)
      records[index] = updatedDraft
      return updatedDraft
    },
  }
}

function createWorkflowRegistry(workflow: WorkflowRunner): WorkflowRegistry {
  return {
    getWorkflow(name) {
      return name === workflow.metadata.name ? workflow : undefined
    },
  }
}

function makeDraft(overrides: Partial<NewsletterDraft> = {}): NewsletterDraft {
  return {
    id: overrides.id ?? 'draft-default',
    themeId: overrides.themeId ?? theme.id,
    issueDate: overrides.issueDate ?? '2026-05-02',
    version: overrides.version ?? 1,
    status: overrides.status ?? 'draft',
    subject: overrides.subject ?? workflowResult.subject,
    previewText: overrides.previewText ?? workflowResult.previewText,
    draftPayload: overrides.draftPayload ?? workflowResult,
    renderedHtml: overrides.renderedHtml ?? '<article>Tech Daily</article>',
    approvedAt: overrides.approvedAt ?? null,
    sentAt: overrides.sentAt ?? null,
    sendProvider: overrides.sendProvider ?? null,
    providerMessageId: overrides.providerMessageId ?? null,
    errorMessage: overrides.errorMessage ?? null,
    createdAt: overrides.createdAt ?? '2026-05-02T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-02T00:00:00.000Z',
  }
}
