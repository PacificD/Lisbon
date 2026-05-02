import type { DraftRecord, SubscriberRecord, ThemeRecord } from '../../../shared/src/schemas.ts'

export interface ThemeRepository {
  create(theme: ThemeRecord): Promise<ThemeRecord>
  findBySlug(slug: string): Promise<ThemeRecord | null>
  list(): Promise<ThemeRecord[]>
  update(theme: ThemeRecord): Promise<ThemeRecord>
}

export interface SubscriberRepository {
  add(subscriber: SubscriberRecord): Promise<SubscriberRecord>
  listByTheme(themeId: string): Promise<SubscriberRecord[]>
  remove(themeId: string, email: string): Promise<void>
}

export interface DraftRepository {
  create(draft: DraftRecord): Promise<DraftRecord>
  listByThemeAndIssueDate(themeId: string, issueDate: string): Promise<DraftRecord[]>
  findById(id: string): Promise<DraftRecord | null>
  update(draft: DraftRecord): Promise<DraftRecord>
}
