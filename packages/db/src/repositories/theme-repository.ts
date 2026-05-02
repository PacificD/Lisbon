import type { Theme } from '../../../core/src/domain/theme.js'
import type { ThemeRepository } from '../../../core/src/ports/repositories.js'
import type { SupabaseClient } from '@supabase/supabase-js'

type ThemeRow = {
  id: string
  slug: string
  name: string
  workflow_name: string
  enabled: boolean
  created_at: string
  updated_at: string
}

function mapThemeRow(row: ThemeRow): Theme {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    workflowName: row.workflow_name,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createThemeRepository(client: SupabaseClient): ThemeRepository {
  return {
    async create(input) {
      const { data, error } = await client
        .from('themes')
        .insert({
          slug: input.slug,
          name: input.name,
          workflow_name: input.workflowName,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return mapThemeRow(data as ThemeRow)
    },

    async findBySlug(slug) {
      const { data, error } = await client
        .from('themes')
        .select()
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data ? mapThemeRow(data as ThemeRow) : null
    },

    async list() {
      const { data, error } = await client
        .from('themes')
        .select()
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data as ThemeRow[]).map(mapThemeRow)
    },

    async updateBySlug(slug, patch) {
      const { data, error } = await client
        .from('themes')
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.workflowName !== undefined ? { workflow_name: patch.workflowName } : {}),
          ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
          updated_at: patch.updatedAt ?? new Date().toISOString(),
        })
        .eq('slug', slug)
        .select()
        .single()

      if (error) {
        throw error
      }

      return mapThemeRow(data as ThemeRow)
    },
  }
}
