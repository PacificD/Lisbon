import type { ThemeSubscriber } from '../../../core/src/domain/subscriber.js'
import type { SubscriberRepository } from '../../../core/src/ports/repositories.js'
import type { SupabaseClient } from '@supabase/supabase-js'

type ThemeSubscriberRow = {
  id: string
  theme_id: string
  email: string
  created_at: string
}

function mapSubscriberRow(row: ThemeSubscriberRow): ThemeSubscriber {
  return {
    id: row.id,
    themeId: row.theme_id,
    email: row.email,
    createdAt: row.created_at,
  }
}

function mapSubscriber(subscriber: ThemeSubscriber): ThemeSubscriberRow {
  return {
    id: subscriber.id,
    theme_id: subscriber.themeId,
    email: subscriber.email,
    created_at: subscriber.createdAt,
  }
}

export class SupabaseSubscriberRepository implements SubscriberRepository {
  constructor(private readonly client: SupabaseClient) {}

  async add(subscriber: ThemeSubscriber): Promise<ThemeSubscriber> {
    const { data, error } = await this.client
      .from('theme_subscribers')
      .insert(mapSubscriber(subscriber))
      .select()
      .single()

    if (error) {
      throw error
    }

    return mapSubscriberRow(data as ThemeSubscriberRow)
  }

  async listByTheme(themeId: string): Promise<ThemeSubscriber[]> {
    const { data, error } = await this.client
      .from('theme_subscribers')
      .select()
      .eq('theme_id', themeId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return (data as ThemeSubscriberRow[]).map(mapSubscriberRow)
  }

  async remove(themeId: string, email: string): Promise<void> {
    const { error } = await this.client
      .from('theme_subscribers')
      .delete()
      .eq('theme_id', themeId)
      .eq('email', email)

    if (error) {
      throw error
    }
  }
}
