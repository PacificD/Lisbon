import type { NewsletterDraft } from '../domain/draft.js'

export function getNextDraftVersion(drafts: NewsletterDraft[]): number {
  return drafts.reduce((maxVersion, draft) => Math.max(maxVersion, draft.version), 0) + 1
}

export function pickLatestApprovedDraft(drafts: NewsletterDraft[]): NewsletterDraft | null {
  const approvedDrafts = drafts.filter((draft) => draft.status === 'approved')

  if (approvedDrafts.length === 0) {
    return null
  }

  return approvedDrafts.reduce((latestDraft, draft) =>
    draft.version > latestDraft.version ? draft : latestDraft,
  )
}

export function approveDraft(draft: NewsletterDraft, now: string): NewsletterDraft {
  if (draft.status !== 'draft') {
    throw new Error(`Only drafts in draft status can be approved. Received ${draft.status}.`)
  }

  return {
    ...draft,
    status: 'approved',
    approvedAt: now,
    updatedAt: now,
    errorMessage: null,
  }
}

export function markDraftSent(
  draft: NewsletterDraft,
  input: { now: string; provider: 'resend'; providerMessageId: string },
): NewsletterDraft {
  if (draft.status !== 'approved') {
    throw new Error(`Only approved drafts can be sent. Received ${draft.status}.`)
  }

  return {
    ...draft,
    status: 'sent',
    sentAt: input.now,
    sendProvider: input.provider,
    providerMessageId: input.providerMessageId,
    errorMessage: null,
    updatedAt: input.now,
  }
}

export function ensureSendAllowed(drafts: NewsletterDraft[], targetDraft: NewsletterDraft): void {
  if (targetDraft.status !== 'approved') {
    throw new Error(`Only approved drafts can be sent. Received ${targetDraft.status}.`)
  }

  const alreadySent = drafts.some(
    (draft) =>
      draft.status === 'sent' &&
      draft.themeId === targetDraft.themeId &&
      draft.issueDate === targetDraft.issueDate,
  )

  if (alreadySent) {
    throw new Error(`A newsletter for ${targetDraft.themeId} on ${targetDraft.issueDate} has already been sent.`)
  }
}

export function markDraftFailed(draft: NewsletterDraft, input: { now: string; errorMessage: string }): NewsletterDraft {
  return {
    ...draft,
    status: 'failed',
    errorMessage: input.errorMessage,
    updatedAt: input.now,
  }
}
