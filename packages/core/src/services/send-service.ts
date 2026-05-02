import type { NewsletterConfig } from '@lisbon/shared'

import type { NewsletterDraft } from '../domain/draft.js'
import { hasSentDraft, markDraftFailed, markDraftSent, selectLatestApprovedDraft } from '../lib/draft-state.js'
import type { DraftRepository, SubscriberRepository, ThemeRepository } from '../ports/repositories.js'
import type { EmailSender } from '../ports/runtime.js'

export interface SendService {
  sendIssue(input: {
    themeSlug: string
    issueDate: string
    draftId?: string
    version?: number
    now?: string
  }): Promise<NewsletterDraft>
}

export function createSendService(input: {
  config: NewsletterConfig
  draftRepository: DraftRepository
  emailSender: EmailSender
  subscriberRepository: SubscriberRepository
  themeRepository: ThemeRepository
}): SendService {
  const { config, draftRepository, emailSender, subscriberRepository, themeRepository } = input

  return {
    async sendIssue({ themeSlug, issueDate, draftId, version, now = new Date().toISOString() }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      const drafts = await draftRepository.listByThemeAndIssueDate(theme.id, issueDate)

      if (hasSentDraft(drafts)) {
        throw new Error(`A newsletter for ${theme.slug} on ${issueDate} has already been sent.`)
      }

      const selectedDraft = await resolveDraftSelection({ draftId, draftRepository, drafts, issueDate, themeId: theme.id, version })

      if (selectedDraft.status !== 'approved') {
        throw new Error(`Draft ${selectedDraft.id} must be approved before sending.`)
      }

      const subscribers = await subscriberRepository.listByTheme(theme.id)

      try {
        const result = await emailSender.send({
          from: config.MAIL_FROM,
          to: subscribers.map((subscriber) => subscriber.email),
          subject: selectedDraft.subject,
          html: selectedDraft.renderedHtml,
        })

        return draftRepository.update(markDraftSent(selectedDraft, { now, providerMessageId: result.providerMessageId }))
      } catch (error) {
        const failedDraft = markDraftFailed(selectedDraft, {
          now,
          errorMessage: error instanceof Error ? error.message : 'Unknown send failure',
        })

        await draftRepository.update(failedDraft)
        throw error
      }
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

async function resolveDraftSelection(input: {
  draftId?: string
  draftRepository: DraftRepository
  drafts: NewsletterDraft[]
  issueDate: string
  themeId: string
  version?: number
}): Promise<NewsletterDraft> {
  const { draftId, draftRepository, drafts, issueDate, themeId, version } = input

  if (draftId) {
    const draft = await draftRepository.findById(draftId)

    if (!draft || draft.themeId !== themeId || draft.issueDate !== issueDate) {
      throw new Error(`Draft ${draftId} was not found for the requested issue.`)
    }

    return draft
  }

  if (typeof version === 'number') {
    const draft = drafts.find((candidate) => candidate.version === version)

    if (!draft) {
      throw new Error(`Draft version ${version} was not found for the requested issue.`)
    }

    return draft
  }

  const latestApprovedDraft = selectLatestApprovedDraft(drafts)

  if (!latestApprovedDraft) {
    throw new Error(`No approved draft exists for issue ${issueDate}.`)
  }

  return latestApprovedDraft
}
