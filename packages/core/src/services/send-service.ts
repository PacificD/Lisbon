import type { NewsletterDraft } from '../domain/draft.js'
import { approveDraft as approveDraftState, ensureSendAllowed, markDraftFailed, markDraftSent, pickLatestApprovedDraft } from '../lib/draft-state.js'
import type { DraftRepository, SubscriberRepository, ThemeRepository } from '../ports/repositories.js'
import type { DraftRenderer, EmailSender } from '../ports/runtime.js'

export interface SendService {
  approve(input: {
    themeSlug: string
    issueDate: string
    draftId?: string
    version?: number
    now?: string
  }): Promise<NewsletterDraft>
  send(input: {
    themeSlug: string
    issueDate: string
    draftId?: string
    version?: number
    now?: string
  }): Promise<NewsletterDraft>
}

export function createSendService(
  themeRepository: ThemeRepository,
  subscriberRepository: SubscriberRepository,
  draftRepository: DraftRepository,
  emailSender: EmailSender,
  draftRenderer: DraftRenderer,
  mailFrom: string,
): SendService {
  return {
    async approve({ themeSlug, issueDate, draftId, version, now = new Date().toISOString() }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      const drafts = await draftRepository.listByThemeAndIssueDate(theme.id, issueDate)
      const selectedDraft = await resolveApprovalSelection({
        draftId,
        draftRepository,
        drafts,
        issueDate,
        themeId: theme.id,
        version,
      })

      const approvedDraft = approveDraftState(
        {
          ...selectedDraft,
          renderedHtml: await draftRenderer.renderHtml({
            theme,
            result: selectedDraft.draftPayload,
          }),
        },
        now,
      )

      return draftRepository.update(approvedDraft)
    },

    async send({ themeSlug, issueDate, draftId, version, now = new Date().toISOString() }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      const drafts = await draftRepository.listByThemeAndIssueDate(theme.id, issueDate)
      const selectedDraft = await resolveDraftSelection({ draftId, draftRepository, drafts, issueDate, themeId: theme.id, version })
      ensureSendAllowed(drafts, selectedDraft)

      const subscribers = await subscriberRepository.listByTheme(theme.id)

      let sendResult: { provider: 'resend'; providerMessageId: string }

      try {
        sendResult = await emailSender.send({
          from: mailFrom,
          to: subscribers.map((subscriber) => subscriber.email),
          subject: selectedDraft.subject,
          html: selectedDraft.renderedHtml,
          text: draftRenderer.renderText({
            theme,
            result: selectedDraft.draftPayload,
          }),
        })
      } catch (error) {
        const failedDraft = markDraftFailed(selectedDraft, {
          now,
          errorMessage: error instanceof Error ? error.message : 'Unknown send failure',
        })

        await draftRepository.update(failedDraft)
        throw error
      }

      return draftRepository.update({
        ...markDraftSent(selectedDraft, {
          now,
          providerMessageId: sendResult.providerMessageId,
        }),
        sendProvider: sendResult.provider,
      })
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

  const latestApprovedDraft = pickLatestApprovedDraft(drafts)

  if (!latestApprovedDraft) {
    throw new Error(`No approved draft exists for issue ${issueDate}.`)
  }

  return latestApprovedDraft
}

async function resolveApprovalSelection(input: {
  draftId?: string
  draftRepository: DraftRepository
  drafts: NewsletterDraft[]
  issueDate: string
  themeId: string
  version?: number
}): Promise<NewsletterDraft> {
  const selectedDraft = await resolveDraftSelectionBySelector(input)

  if (selectedDraft) {
    return selectedDraft
  }

  const latestDraft = pickLatestApprovableDraft(input.drafts)

  if (!latestDraft) {
    throw new Error(`No draft exists for issue ${input.issueDate}.`)
  }

  return latestDraft
}

async function resolveDraftSelectionBySelector(input: {
  draftId?: string
  draftRepository: DraftRepository
  drafts: NewsletterDraft[]
  issueDate: string
  themeId: string
  version?: number
}): Promise<NewsletterDraft | null> {
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

  return null
}

function pickLatestApprovableDraft(drafts: NewsletterDraft[]): NewsletterDraft | null {
  const approvableDrafts = drafts.filter((draft) => draft.status === 'draft')

  if (approvableDrafts.length === 0) {
    return null
  }

  return approvableDrafts.reduce((latestDraft, draft) =>
    draft.version > latestDraft.version ? draft : latestDraft,
  )
}
