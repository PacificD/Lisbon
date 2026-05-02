import { DraftRecordSchema, type DraftRecord } from '../../../shared/src/schemas.ts'

type DraftCreateInput = Omit<
  DraftRecord,
  'status' | 'approvedAt' | 'sentAt' | 'sendProvider' | 'providerMessageId' | 'errorMessage'
>

type SentDraftDetails = {
  sentAt: string
  sendProvider: 'resend'
  providerMessageId: string
}

export function createDraftRecord(input: DraftCreateInput): DraftRecord {
  return DraftRecordSchema.parse({
    ...input,
    status: 'draft',
    approvedAt: null,
    sentAt: null,
    sendProvider: null,
    providerMessageId: null,
    errorMessage: null,
  })
}

export function approveDraft(draft: DraftRecord, approvedAt: string): DraftRecord {
  if (draft.status !== 'draft') {
    throw new Error(`Only draft records can be approved. Received: ${draft.status}`)
  }

  return DraftRecordSchema.parse({
    ...draft,
    status: 'approved',
    approvedAt,
    updatedAt: approvedAt,
  })
}

export function markDraftSent(draft: DraftRecord, details: SentDraftDetails): DraftRecord {
  if (draft.status !== 'approved') {
    throw new Error(`Only approved drafts can be sent. Received: ${draft.status}`)
  }

  return DraftRecordSchema.parse({
    ...draft,
    status: 'sent',
    sentAt: details.sentAt,
    sendProvider: details.sendProvider,
    providerMessageId: details.providerMessageId,
    errorMessage: null,
    updatedAt: details.sentAt,
  })
}

export function markDraftFailed(draft: DraftRecord, errorMessage: string, failedAt: string): DraftRecord {
  if (!['draft', 'approved'].includes(draft.status)) {
    throw new Error(`Only draft or approved records can fail. Received: ${draft.status}`)
  }

  return DraftRecordSchema.parse({
    ...draft,
    status: 'failed',
    errorMessage,
    updatedAt: failedAt,
  })
}

export function getNextDraftVersion(existingDrafts: DraftRecord[]): number {
  const currentMax = existingDrafts.reduce((maxVersion, draft) => Math.max(maxVersion, draft.version), 0)
  return currentMax + 1
}

export function getLatestApprovedDraft(existingDrafts: DraftRecord[]): DraftRecord | undefined {
  return existingDrafts
    .filter((draft) => draft.status === 'approved')
    .sort((left, right) => right.version - left.version)[0]
}

export function assertCanSendDraft(input: { targetDraft: DraftRecord; existingDrafts: DraftRecord[] }): void {
  const { targetDraft, existingDrafts } = input

  if (targetDraft.status !== 'approved') {
    throw new Error(`Only approved drafts can be sent. Received: ${targetDraft.status}`)
  }

  const alreadySent = existingDrafts.some(
    (draft) =>
      draft.status === 'sent' &&
      draft.themeId === targetDraft.themeId &&
      draft.issueDate === targetDraft.issueDate,
  )

  if (alreadySent) {
    throw new Error(`A newsletter for ${targetDraft.themeId} on ${targetDraft.issueDate} has already been sent.`)
  }
}
