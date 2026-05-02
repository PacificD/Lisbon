import type { DraftStatus, WorkflowResult } from '@lisbon/shared/types'

export interface NewsletterDraft {
  id: string
  themeId: string
  issueDate: string
  version: number
  status: DraftStatus
  subject: string
  previewText: string
  draftPayload: WorkflowResult
  renderedHtml: string
  approvedAt: string | null
  sentAt: string | null
  sendProvider: 'resend' | null
  providerMessageId: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
