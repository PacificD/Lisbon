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

export function createSubscriberRepository(client: SupabaseClient): SubscriberRepository {
  return {
    async add(themeId, email) {
      const { data, error } = await client
        .from('theme_subscribers')
        .insert({
          theme_id: themeId,
          email,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return mapSubscriberRow(data as ThemeSubscriberRow)
    },

    async listByTheme(themeId) {
      const { data, error } = await client
        .from('theme_subscribers')
        .select()
        .eq('theme_id', themeId)
        .order('email', { ascending: true })

      if (error) {
        throw error
      }

      return (data as ThemeSubscriberRow[]).map(mapSubscriberRow)
    },

    async remove(themeId, email) {
      const { error } = await client
        .from('theme_subscribers')
        .delete()
        .eq('theme_id', themeId)
        .eq('email', email)

      if (error) {
        throw error
      }
    },
  }
}
