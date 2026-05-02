import type { NewsletterDraft } from '../domain/draft.js'
import type { ThemeSubscriber } from '../domain/subscriber.js'
import type { Theme } from '../domain/theme.js'

export interface ThemeRepository {
  create(input: { slug: string; name: string; workflowName: string }): Promise<Theme>
  list(): Promise<Theme[]>
  findBySlug(slug: string): Promise<Theme | null>
  updateBySlug(
    slug: string,
    patch: {
      name?: string
      workflowName?: string
      enabled?: boolean
      updatedAt?: string
    },
  ): Promise<Theme>
}

export interface SubscriberRepository {
  add(themeId: string, email: string): Promise<ThemeSubscriber>
  remove(themeId: string, email: string): Promise<void>
  listByTheme(themeId: string): Promise<ThemeSubscriber[]>
}

export interface DraftRepository {
  create(input: {
    id: string
    themeId: string
    issueDate: string
    version: number
    status: NewsletterDraft['status']
    subject: string
    previewText: string
    draftPayload: NewsletterDraft['draftPayload']
    renderedHtml: string
    approvedAt: string | null
    sentAt: string | null
    sendProvider: NewsletterDraft['sendProvider']
    providerMessageId: string | null
    errorMessage: string | null
    createdAt: string
    updatedAt: string
  }): Promise<NewsletterDraft>
  findByThemeAndDate(themeId: string, issueDate: string): Promise<NewsletterDraft[]>
  findById(id: string): Promise<NewsletterDraft | null>
  updateStatus(
    id: string,
    input: {
      status: NewsletterDraft['status']
      renderedHtml?: string
      approvedAt?: string | null
      sentAt?: string | null
      sendProvider?: NewsletterDraft['sendProvider']
      providerMessageId?: string | null
      errorMessage?: string | null
      updatedAt?: string
    },
  ): Promise<NewsletterDraft>
}
