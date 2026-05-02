import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('db package contract', () => {
  it('defines the Supabase package dependencies', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../../packages/db/package.json', import.meta.url), 'utf8'),
    )

    expect(packageJson.name).toBe('@lisbon/db')
    expect(packageJson.type).toBe('module')
    expect(packageJson.dependencies['@lisbon/core']).toBe('workspace:*')
    expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined()
  })

  it('exports a client factory and repository implementations that match the core ports', async () => {
    const { createSupabaseAdminClient } = await import('../../packages/db/src/client.ts')
    const { createThemeRepository } = await import(
      '../../packages/db/src/repositories/theme-repository.ts'
    )
    const { createSubscriberRepository } = await import(
      '../../packages/db/src/repositories/subscriber-repository.ts'
    )
    const { createDraftRepository } = await import(
      '../../packages/db/src/repositories/draft-repository.ts'
    )

    expect(createSupabaseAdminClient).toBeTypeOf('function')
    expect(createThemeRepository).toBeTypeOf('function')
    expect(createSubscriberRepository).toBeTypeOf('function')
    expect(createDraftRepository).toBeTypeOf('function')

    const fakeClient = {
      from: () => {
        throw new Error('not implemented in contract test')
      },
    }

    const themeRepository = createThemeRepository(fakeClient as never)
    const subscriberRepository = createSubscriberRepository(fakeClient as never)
    const draftRepository = createDraftRepository(fakeClient as never)

    expect(themeRepository.create).toBeTypeOf('function')
    expect(themeRepository.findBySlug).toBeTypeOf('function')
    expect(themeRepository.list).toBeTypeOf('function')
    expect(themeRepository.update).toBeTypeOf('function')

    expect(subscriberRepository.add).toBeTypeOf('function')
    expect(subscriberRepository.listByTheme).toBeTypeOf('function')
    expect(subscriberRepository.remove).toBeTypeOf('function')

    expect(draftRepository.create).toBeTypeOf('function')
    expect(draftRepository.listByThemeAndIssueDate).toBeTypeOf('function')
    expect(draftRepository.findById).toBeTypeOf('function')
    expect(draftRepository.update).toBeTypeOf('function')
  })

  it('declares the required schema, constraints, and draft send guard', async () => {
    const sql = await readFile(
      new URL('../../packages/db/src/sql/001_initial_schema.sql', import.meta.url),
      'utf8',
    )

    expect(sql).toContain('create table if not exists themes')
    expect(sql).toContain('slug text not null unique')

    expect(sql).toContain('create table if not exists theme_subscribers')
    expect(sql).toContain('unique (theme_id, email)')

    expect(sql).toContain('create table if not exists newsletter_drafts')
    expect(sql).toContain("status text not null check (status in ('draft', 'approved', 'sent', 'failed'))")
    expect(sql).toContain('version integer not null')
    expect(sql).toContain('unique (theme_id, issue_date, version)')
    expect(sql).toContain('draft_payload_json jsonb not null')
    expect(sql).toContain('rendered_html text not null')
    expect(sql).toContain(
      "create unique index if not exists newsletter_drafts_one_sent_per_issue on newsletter_drafts (theme_id, issue_date) where status = 'sent'",
    )
  })
})
