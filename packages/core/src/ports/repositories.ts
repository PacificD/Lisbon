import type { NewsletterDraft } from '../domain/draft.ts'
import type { ThemeSubscriber } from '../domain/subscriber.ts'
import type { Theme } from '../domain/theme.ts'

export interface ThemeRepository {
  create(theme: Theme): Promise<Theme>
  findBySlug(slug: string): Promise<Theme | null>
  list(): Promise<Theme[]>
  update(theme: Theme): Promise<Theme>
}

export interface SubscriberRepository {
  add(subscriber: ThemeSubscriber): Promise<ThemeSubscriber>
  listByTheme(themeId: string): Promise<ThemeSubscriber[]>
  remove(themeId: string, email: string): Promise<void>
}

export interface DraftRepository {
  create(draft: NewsletterDraft): Promise<NewsletterDraft>
  listByThemeAndIssueDate(themeId: string, issueDate: string): Promise<NewsletterDraft[]>
  findById(id: string): Promise<NewsletterDraft | null>
  update(draft: NewsletterDraft): Promise<NewsletterDraft>
}
