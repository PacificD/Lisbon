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

function mapTheme(theme: Theme): ThemeRow {
  return {
    id: theme.id,
    slug: theme.slug,
    name: theme.name,
    workflow_name: theme.workflowName,
    enabled: theme.enabled,
    created_at: theme.createdAt,
    updated_at: theme.updatedAt,
  }
}

export class SupabaseThemeRepository implements ThemeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(theme: Theme): Promise<Theme> {
    const { data, error } = await this.client
      .from('themes')
      .insert(mapTheme(theme))
      .select()
      .single()

    if (error) {
      throw error
    }

    return mapThemeRow(data as ThemeRow)
  }

  async findBySlug(slug: string): Promise<Theme | null> {
    const { data, error } = await this.client
      .from('themes')
      .select()
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? mapThemeRow(data as ThemeRow) : null
  }

  async list(): Promise<Theme[]> {
    const { data, error } = await this.client
      .from('themes')
      .select()
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return (data as ThemeRow[]).map(mapThemeRow)
  }

  async update(theme: Theme): Promise<Theme> {
    const { data, error } = await this.client
      .from('themes')
      .update(mapTheme(theme))
      .eq('id', theme.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return mapThemeRow(data as ThemeRow)
  }
}
