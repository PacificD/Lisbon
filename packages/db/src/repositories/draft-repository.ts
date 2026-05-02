import type { NewsletterDraft } from '../../../core/src/domain/draft.js'
import type { DraftRepository } from '../../../core/src/ports/repositories.js'
import type { DraftStatus, WorkflowResult } from '@lisbon/shared'
import type { SupabaseClient } from '@supabase/supabase-js'

type NewsletterDraftRow = {
  id: string
  theme_id: string
  issue_date: string
  version: number
  status: DraftStatus
  subject: string
  preview_text: string
  draft_payload_json: WorkflowResult
  rendered_html: string
  approved_at: string | null
  sent_at: string | null
  send_provider: 'resend' | null
  provider_message_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

function mapDraftRow(row: NewsletterDraftRow): NewsletterDraft {
  return {
    id: row.id,
    themeId: row.theme_id,
    issueDate: row.issue_date,
    version: row.version,
    status: row.status,
    subject: row.subject,
    previewText: row.preview_text,
    draftPayload: row.draft_payload_json,
    renderedHtml: row.rendered_html,
    approvedAt: row.approved_at,
    sentAt: row.sent_at,
    sendProvider: row.send_provider,
    providerMessageId: row.provider_message_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDraft(draft: NewsletterDraft): NewsletterDraftRow {
  return {
    id: draft.id,
    theme_id: draft.themeId,
    issue_date: draft.issueDate,
    version: draft.version,
    status: draft.status,
    subject: draft.subject,
    preview_text: draft.previewText,
    draft_payload_json: draft.draftPayload,
    rendered_html: draft.renderedHtml,
    approved_at: draft.approvedAt,
    sent_at: draft.sentAt,
    send_provider: draft.sendProvider,
    provider_message_id: draft.providerMessageId,
    error_message: draft.errorMessage,
    created_at: draft.createdAt,
    updated_at: draft.updatedAt,
  }
}

export function createDraftRepository(client: SupabaseClient): DraftRepository {
  return {
    async create(draft) {
      const { data, error } = await client
        .from('newsletter_drafts')
        .insert(mapDraft(draft))
        .select()
        .single()

      if (error) {
        throw error
      }

      return mapDraftRow(data as NewsletterDraftRow)
    },

    async findByThemeAndDate(themeId, issueDate) {
      const { data, error } = await client
        .from('newsletter_drafts')
        .select()
        .eq('theme_id', themeId)
        .eq('issue_date', issueDate)
        .order('version', { ascending: false })

      if (error) {
        throw error
      }

      return (data as NewsletterDraftRow[]).map(mapDraftRow)
    },

    async findById(id) {
      const { data, error } = await client
        .from('newsletter_drafts')
        .select()
        .eq('id', id)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data ? mapDraftRow(data as NewsletterDraftRow) : null
    },

    async updateStatus(id, input) {
      const { data, error } = await client
        .from('newsletter_drafts')
        .update({
          status: input.status,
          ...(input.renderedHtml !== undefined ? { rendered_html: input.renderedHtml } : {}),
          ...(input.approvedAt !== undefined ? { approved_at: input.approvedAt } : {}),
          ...(input.sentAt !== undefined ? { sent_at: input.sentAt } : {}),
          ...(input.sendProvider !== undefined ? { send_provider: input.sendProvider } : {}),
          ...(input.providerMessageId !== undefined ? { provider_message_id: input.providerMessageId } : {}),
          ...(input.errorMessage !== undefined ? { error_message: input.errorMessage } : {}),
          updated_at: input.updatedAt ?? new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return mapDraftRow(data as NewsletterDraftRow)
    },
  }
}
