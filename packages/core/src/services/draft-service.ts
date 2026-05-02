import { randomUUID } from 'node:crypto'

import type { NewsletterConfig } from '@lisbon/shared'

import type { NewsletterDraft } from '../domain/draft.js'
import { approveDraft, getNextDraftVersion } from '../lib/draft-state.js'
import type { DraftRepository, ThemeRepository } from '../ports/repositories.js'
import type { DraftRenderer, WorkflowRegistry } from '../ports/runtime.js'

export interface DraftService {
  generateDraft(input: { themeSlug: string; issueDate: string; now?: string }): Promise<NewsletterDraft>
  approveDraft(input: { draftId: string; now?: string }): Promise<NewsletterDraft>
  listDrafts(input: { themeSlug: string; issueDate: string }): Promise<NewsletterDraft[]>
}

export function createDraftService(input: {
  config: NewsletterConfig
  draftRenderer: DraftRenderer
  draftRepository: DraftRepository
  themeRepository: ThemeRepository
  workflowRegistry: WorkflowRegistry
}): DraftService {
  const { config, draftRenderer, draftRepository, themeRepository, workflowRegistry } = input

  return {
    async generateDraft({ themeSlug, issueDate, now = new Date().toISOString() }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      const workflow = workflowRegistry.getWorkflow(theme.workflowName)

      if (!workflow) {
        throw new Error(`Workflow ${theme.workflowName} is not registered.`)
      }

      const existingDrafts = await draftRepository.listByThemeAndIssueDate(theme.id, issueDate)
      const result = await workflow.run({ theme, issueDate, config })
      const renderedHtml = draftRenderer.render({ theme, result })

      return draftRepository.create({
        id: randomUUID(),
        themeId: theme.id,
        issueDate,
        version: getNextDraftVersion(existingDrafts),
        status: 'draft',
        subject: result.subject,
        previewText: result.previewText,
        draftPayload: result,
        renderedHtml,
        approvedAt: null,
        sentAt: null,
        sendProvider: null,
        providerMessageId: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      })
    },

    async approveDraft({ draftId, now = new Date().toISOString() }) {
      const draft = await draftRepository.findById(draftId)

      if (!draft) {
        throw new Error(`Draft ${draftId} was not found.`)
      }

      return draftRepository.update(approveDraft(draft, now))
    },

    async listDrafts({ themeSlug, issueDate }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      return draftRepository.listByThemeAndIssueDate(theme.id, issueDate)
    },
  }
}

async function getThemeBySlug(themeRepository: ThemeRepository, slug: string) {
  const theme = await themeRepository.findBySlug(slug)

  if (!theme) {
    throw new Error(`Theme ${slug} was not found.`)
  }

  return theme
}
