import { describe, expect, it } from 'vitest'

import type { NewsletterConfig, WorkflowResult } from '@lisbon/shared'

import {
  createDraftService,
  createSendService,
  createThemeService,
  ensureSendAllowed,
  getNextDraftVersion,
  pickLatestApprovedDraft,
} from '../../packages/core/src/index.ts'
import type {
  DraftRenderer,
  DraftRepository,
  EmailSender,
  NewsletterDraft,
  SubscriberRepository,
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
  it('computes the next version, picks the latest approved draft, and rejects duplicate sends', () => {
    const drafts = [
      makeDraft({ id: 'draft-1', version: 1, status: 'draft' }),
      makeDraft({ id: 'draft-2', version: 2, status: 'approved' }),
      makeDraft({ id: 'draft-3', version: 3, status: 'failed' }),
      makeDraft({ id: 'draft-4', version: 4, status: 'approved' }),
      makeDraft({
        id: 'draft-5',
        version: 5,
        status: 'sent',
        approvedAt: '2026-05-02T09:00:00.000Z',
        sentAt: '2026-05-02T10:00:00.000Z',
        sendProvider: 'resend',
        providerMessageId: 'msg-1',
      }),
    ]

    expect(getNextDraftVersion(drafts)).toBe(6)
    expect(pickLatestApprovedDraft(drafts)?.id).toBe('draft-4')
    expect(() => ensureSendAllowed(drafts, drafts[1])).toThrow('already been sent')
  })

  it('generates a new draft with the next version and approves it', async () => {
    const existingDrafts = [
      makeDraft({ id: 'draft-1', version: 1, status: 'draft' }),
      makeDraft({ id: 'draft-2', version: 2, status: 'approved' }),
    ]

    const draftRepository = createDraftRepository(existingDrafts)
    const service = createDraftService(
      createThemeRepository(),
      draftRepository,
      createWorkflowRegistry({
        metadata: {
          name: theme.workflowName,
          displayName: 'Tech Daily',
          description: 'Daily tech links',
        },
        async run() {
          return workflowResult
        },
      }),
      createDraftRenderer(),
    )

    const generated = await service.generate({
      themeSlug: theme.slug,
      issueDate: '2026-05-02',
      config,
      now: '2026-05-02T08:00:00.000Z',
    })

    expect(generated.version).toBe(3)
    expect(generated.status).toBe('draft')
    expect(generated.subject).toBe(workflowResult.subject)
    expect(generated.renderedHtml).toContain('Tech Daily')

    const approved = await service.approve({
      draftId: generated.id,
      now: '2026-05-02T09:00:00.000Z',
    })

    expect(approved.status).toBe('approved')
    expect(approved.approvedAt).toBe('2026-05-02T09:00:00.000Z')
    expect(draftRepository.records.at(-1)?.status).toBe('approved')
  })

  it('approves a selected draft and then sends that issue through send service', async () => {
    let sendCalls = 0
    let sentMessage: Parameters<EmailSender['send']>[0] | undefined
    const draftRepository = createDraftRepository([
      makeDraft({
        id: 'draft-1',
        version: 1,
        status: 'draft',
        subject: 'Tech Daily v1',
        previewText: 'Preview v1',
      }),
      makeDraft({
        id: 'draft-2',
        version: 2,
        status: 'approved',
        approvedAt: '2026-05-02T08:30:00.000Z',
        subject: 'Tech Daily v2',
        previewText: 'Preview v2',
      }),
    ])

    const service = createSendService(
      createThemeRepository(),
      createSubscriberRepository(),
      draftRepository,
      {
        async send(message) {
          sendCalls += 1
          sentMessage = message
          return { provider: 'resend', providerMessageId: 'msg-2' }
        },
      },
      createDraftRenderer(),
      config.MAIL_FROM,
    )

    const approved = await service.approve({
      themeSlug: theme.slug,
      issueDate: '2026-05-02',
      draftId: 'draft-1',
      now: '2026-05-02T09:00:00.000Z',
    })

    expect(approved.status).toBe('approved')
    expect(approved.approvedAt).toBe('2026-05-02T09:00:00.000Z')
    expect(approved.renderedHtml).toContain('Tech Daily v1')

    const sent = await service.send({
      themeSlug: theme.slug,
      issueDate: '2026-05-02',
      draftId: 'draft-1',
      now: '2026-05-02T11:00:00.000Z',
    })

    expect(sent.status).toBe('sent')
    expect(sent.id).toBe('draft-1')
    expect(sent.sendProvider).toBe('resend')
    expect(sendCalls).toBe(1)
    expect(sentMessage).toEqual({
      from: config.MAIL_FROM,
      to: ['reader@example.com'],
      subject: 'Tech Daily v1',
      html: '<article data-theme="tech">Tech Daily v1</article>',
      text: 'Tech: Tech Daily v1',
    })
  })

  it('approves the latest draft when no selector is provided', async () => {
    const draftRepository = createDraftRepository([
      makeDraft({
        id: 'draft-1',
        version: 1,
        status: 'draft',
        subject: 'Tech Daily v1',
      }),
      makeDraft({
        id: 'draft-2',
        version: 2,
        status: 'draft',
        subject: 'Tech Daily v2',
      }),
    ])

    const service = createSendService(
      createThemeRepository(),
      createSubscriberRepository(),
      draftRepository,
      { async send() { return { provider: 'resend', providerMessageId: 'msg-unused' } } },
      createDraftRenderer(),
      config.MAIL_FROM,
    )

    const approved = await service.approve({
      themeSlug: theme.slug,
      issueDate: '2026-05-02',
      now: '2026-05-02T09:00:00.000Z',
    })

    expect(approved.id).toBe('draft-2')
    expect(approved.status).toBe('approved')
  })

  it('does not rewrite a successful provider send into failed when repository update fails', async () => {
    let sendCalls = 0
    let updateCalls = 0
    const sentDraft = makeDraft({
      id: 'draft-1',
      version: 1,
      status: 'approved',
      approvedAt: '2026-05-02T08:30:00.000Z',
      subject: 'Tech Daily v1',
    })

    const draftRepository: DraftRepository = {
      async create() {
        throw new Error('not used in test')
      },
      async findByThemeAndDate() {
        return [sentDraft]
      },
      async findById(id) {
        return id === sentDraft.id ? sentDraft : null
      },
      async updateStatus() {
        updateCalls += 1
        throw new Error('database write failed')
      },
    }

    const service = createSendService(
      createThemeRepository(),
      createSubscriberRepository(),
      draftRepository,
      {
        async send() {
          sendCalls += 1
          return { provider: 'resend', providerMessageId: 'msg-1' }
        },
      },
      createDraftRenderer(),
      config.MAIL_FROM,
    )

    await expect(
      service.send({
        themeSlug: theme.slug,
        issueDate: '2026-05-02',
        draftId: sentDraft.id,
        now: '2026-05-02T11:00:00.000Z',
      }),
    ).rejects.toThrow('database write failed')

    expect(sendCalls).toBe(1)
    expect(updateCalls).toBe(1)
  })

  it('rejects empty workflow names during theme updates', async () => {
    const existingTheme = { ...theme }
    const service = createThemeService(
      {
        async create() {
          throw new Error('not used in test')
        },
        async findBySlug(slug) {
          return slug === existingTheme.slug ? existingTheme : null
        },
        async list() {
          return [existingTheme]
        },
        async updateBySlug() {
          throw new Error('should not persist invalid workflow names')
        },
      },
      createWorkflowRegistry({
        metadata: {
          name: theme.workflowName,
          displayName: 'Tech Daily',
          description: 'Daily tech links',
        },
        async run() {
          return workflowResult
        },
      }),
    )

    await expect(
      service.updateTheme({
        slug: theme.slug,
        workflowName: '',
        now: '2026-05-02T09:00:00.000Z',
      }),
    ).rejects.toThrow('Workflow name cannot be empty')
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
    async findByThemeAndDate(themeId, issueDate) {
      return records.filter((draft) => draft.themeId === themeId && draft.issueDate === issueDate)
    },
    async findById(id) {
      return records.find((draft) => draft.id === id) ?? null
    },
    async updateStatus(id, input) {
      const index = records.findIndex((draft) => draft.id === id)
      const updatedDraft = {
        ...records[index],
        ...input,
      }
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

function createThemeRepository(): ThemeRepository {
  return {
    async create() {
      throw new Error('not used in test')
    },
    async findBySlug(slug) {
      return slug === theme.slug ? theme : null
    },
    async list() {
      return [theme]
    },
    async updateBySlug() {
      throw new Error('not used in test')
    },
  }
}

function createSubscriberRepository(): SubscriberRepository {
  return {
    async add() {
      throw new Error('not used in test')
    },
    async listByTheme() {
      return [{ id: 'subscriber-1', themeId: theme.id, email: 'reader@example.com', createdAt: '2026-05-02T00:00:00.000Z' }]
    },
    async remove() {
      throw new Error('not used in test')
    },
  }
}

function createDraftRenderer(): DraftRenderer {
  return {
    render: ({ theme: currentTheme, result }) =>
      Promise.resolve(`<article data-theme="${currentTheme.slug}">${result.subject}</article>`),
    renderHtml: ({ theme: currentTheme, result }) =>
      Promise.resolve(`<article data-theme="${currentTheme.slug}">${result.subject}</article>`),
    renderText: ({ theme: currentTheme, result }) => `${currentTheme.name}: ${result.subject}`,
  }
}

function makeDraft(overrides: Partial<NewsletterDraft> = {}): NewsletterDraft {
  const subject = overrides.subject ?? workflowResult.subject
  const previewText = overrides.previewText ?? workflowResult.previewText
  const draftPayload = overrides.draftPayload ?? {
    ...workflowResult,
    subject,
    previewText,
  }

  return {
    id: overrides.id ?? 'draft-default',
    themeId: overrides.themeId ?? theme.id,
    issueDate: overrides.issueDate ?? '2026-05-02',
    version: overrides.version ?? 1,
    status: overrides.status ?? 'draft',
    subject,
    previewText,
    draftPayload,
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
