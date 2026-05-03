import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createCliApp } from '../../apps/cli/src/app.tsx'
import { buildCli } from '../../apps/cli/src/index.ts'
import type { CliRuntime } from '../../apps/cli/src/runtime.ts'

describe('CLI command smoke test', () => {
  const previewDirs: string[] = []

  afterEach(() => {
    for (const directory of previewDirs.splice(0)) {
      rmSync(directory, { force: true, recursive: true })
    }
  })

  it('exposes the planned command list', () => {
    expect(buildCli()).toContain('theme list')
    expect(buildCli()).toContain('send issue')
  })

  it('routes core commands and writes draft previews', async () => {
    const previewOutputDir = mkdtempSync(join(tmpdir(), 'lisbon-cli-smoke-'))
    previewDirs.push(previewOutputDir)

    const calls: Array<{ name: string; input?: unknown }> = []
    const runtime = createRuntimeDouble({ calls, previewOutputDir })
    const app = createCliApp(runtime)

    await expect(
      app.run(['theme', 'create', '--slug', 'tech', '--name', 'Tech', '--workflow', 'frontend-daily']),
    ).resolves.toContain('Created theme tech')

    await expect(app.run(['theme', 'list'])).resolves.toContain('tech')

    await expect(
      app.run(['theme', 'update', '--slug', 'tech', '--name', 'Tech Daily', '--enabled', 'false']),
    ).resolves.toContain('Updated theme tech')

    await expect(
      app.run(['subscriber', 'add', '--theme', 'tech', '--email', 'reader@example.com']),
    ).resolves.toContain('reader@example.com')

    await expect(app.run(['subscriber', 'list', '--theme', 'tech'])).resolves.toContain('reader@example.com')

    await expect(
      app.run(['subscriber', 'remove', '--theme', 'tech', '--email', 'reader@example.com']),
    ).resolves.toContain('Removed subscriber')

    await expect(
      app.run(['draft', 'generate', '--theme', 'tech', '--date', '2026-05-03']),
    ).resolves.toContain('Generated draft')

    await expect(
      app.run(['draft', 'list', '--theme', 'tech', '--date', '2026-05-03']),
    ).resolves.toContain('version 2')

    const showOutput = await app.run([
      'draft',
      'show',
      '--theme',
      'tech',
      '--date',
      '2026-05-03',
      '--version',
      '2',
      '--write-preview',
    ])
    expect(showOutput).toContain('Tech Daily for 2026-05-03')

    const previewPathMatch = showOutput.match(/^Preview: (.+)$/m)
    expect(previewPathMatch?.[1]).toBeTruthy()
    expect(readFileSync(previewPathMatch![1], 'utf8')).toContain('<article data-preview="tech-2026-05-03-v2">')

    await expect(
      app.run(['draft', 'approve', '--theme', 'tech', '--date', '2026-05-03', '--version', '2']),
    ).resolves.toContain('Approved draft')

    await expect(
      app.run(['send', 'issue', '--theme', 'tech', '--date', '2026-05-03', '--version', '2', '--yes']),
    ).resolves.toContain('Sent issue')

    expect(calls).toEqual([
      {
        name: 'theme.create',
        input: { slug: 'tech', name: 'Tech', workflowName: 'frontend-daily' },
      },
      { name: 'theme.list' },
      {
        name: 'theme.update',
        input: { slug: 'tech', name: 'Tech Daily', enabled: false },
      },
      {
        name: 'subscriber.add',
        input: { themeSlug: 'tech', email: 'reader@example.com' },
      },
      {
        name: 'subscriber.list',
        input: { themeSlug: 'tech' },
      },
      {
        name: 'subscriber.remove',
        input: { themeSlug: 'tech', email: 'reader@example.com' },
      },
      {
        name: 'draft.generate',
        input: { themeSlug: 'tech', issueDate: '2026-05-03' },
      },
      {
        name: 'draft.list',
        input: { themeSlug: 'tech', issueDate: '2026-05-03' },
      },
      {
        name: 'draft.list',
        input: { themeSlug: 'tech', issueDate: '2026-05-03' },
      },
      {
        name: 'runtime.writePreview',
        input: { draftId: 'draft-2', html: '<article data-preview="tech-2026-05-03-v2">Preview</article>' },
      },
      {
        name: 'send.approve',
        input: { themeSlug: 'tech', issueDate: '2026-05-03', version: 2 },
      },
      {
        name: 'send.send',
        input: { themeSlug: 'tech', issueDate: '2026-05-03', version: 2 },
      },
    ])
  })
})

function createRuntimeDouble(input: {
  calls: Array<{ name: string; input?: unknown }>
  previewOutputDir: string
}): CliRuntime {
  const draftRecord = {
    id: 'draft-2',
    themeId: 'theme-1',
    issueDate: '2026-05-03',
    version: 2,
    status: 'draft' as const,
    subject: 'Tech Daily for 2026-05-03',
    previewText: 'Preview text',
    draftPayload: {
      subject: 'Tech Daily for 2026-05-03',
      previewText: 'Preview text',
      intro: 'Preview intro',
      items: [
        {
          title: 'Preview item',
          source: 'Lisbon',
          url: 'https://example.com/preview-item',
          summary: 'A preview item for the smoke test.',
        },
      ],
    },
    renderedHtml: '<article data-preview="tech-2026-05-03-v2">Preview</article>',
    approvedAt: null,
    sentAt: null,
    sendProvider: null,
    providerMessageId: null,
    errorMessage: null,
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
  }

  return {
    config: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      RESEND_API_KEY: 'resend-key',
      MAIL_FROM: 'Lisbon <newsletter@example.com>',
      PREVIEW_OUTPUT_DIR: input.previewOutputDir,
      DEFAULT_ISSUE_DATE_TIMEZONE: 'Asia/Shanghai',
    },
    themeService: {
      async createTheme(inputValue) {
        input.calls.push({ name: 'theme.create', input: inputValue })
        return {
          id: 'theme-1',
          slug: inputValue.slug,
          name: inputValue.name,
          workflowName: inputValue.workflowName,
          enabled: true,
          createdAt: '2026-05-03T00:00:00.000Z',
          updatedAt: '2026-05-03T00:00:00.000Z',
        }
      },
      async listThemes() {
        input.calls.push({ name: 'theme.list' })
        return [
          {
            id: 'theme-1',
            slug: 'tech',
            name: 'Tech Daily',
            workflowName: 'frontend-daily',
            enabled: false,
            createdAt: '2026-05-03T00:00:00.000Z',
            updatedAt: '2026-05-03T00:00:00.000Z',
          },
        ]
      },
      async updateTheme(inputValue) {
        input.calls.push({ name: 'theme.update', input: inputValue })
        return {
          id: 'theme-1',
          slug: inputValue.slug,
          name: inputValue.name ?? 'Tech Daily',
          workflowName: inputValue.workflowName ?? 'frontend-daily',
          enabled: inputValue.enabled ?? false,
          createdAt: '2026-05-03T00:00:00.000Z',
          updatedAt: '2026-05-03T00:00:00.000Z',
        }
      },
    },
    subscriberService: {
      async addSubscriber(inputValue) {
        input.calls.push({ name: 'subscriber.add', input: inputValue })
        return {
          id: 'subscriber-1',
          themeId: 'theme-1',
          email: inputValue.email,
          createdAt: '2026-05-03T00:00:00.000Z',
        }
      },
      async listSubscribers(inputValue) {
        input.calls.push({ name: 'subscriber.list', input: inputValue })
        return [
          {
            id: 'subscriber-1',
            themeId: 'theme-1',
            email: 'reader@example.com',
            createdAt: '2026-05-03T00:00:00.000Z',
          },
        ]
      },
      async removeSubscriber(inputValue) {
        input.calls.push({ name: 'subscriber.remove', input: inputValue })
      },
    },
    draftService: {
      async generate(inputValue) {
        input.calls.push({ name: 'draft.generate', input: { themeSlug: inputValue.themeSlug, issueDate: inputValue.issueDate } })
        return draftRecord
      },
      async approve() {
        throw new Error('draft.approve should not be called')
      },
      async list(inputValue) {
        input.calls.push({ name: 'draft.list', input: inputValue })
        return [draftRecord]
      },
    },
    sendService: {
      async approve(inputValue) {
        input.calls.push({ name: 'send.approve', input: inputValue })
        return {
          ...draftRecord,
          status: 'approved' as const,
          approvedAt: '2026-05-03T01:00:00.000Z',
        }
      },
      async send(inputValue) {
        input.calls.push({ name: 'send.send', input: inputValue })
        return {
          ...draftRecord,
          status: 'sent' as const,
          approvedAt: '2026-05-03T01:00:00.000Z',
          sentAt: '2026-05-03T02:00:00.000Z',
          sendProvider: 'resend' as const,
          providerMessageId: 'provider-message-1',
        }
      },
    },
    getDefaultIssueDate() {
      return '2026-05-03'
    },
    async writePreview(inputValue) {
      input.calls.push({ name: 'runtime.writePreview', input: { draftId: inputValue.draft.id, html: inputValue.html } })
      const previewPath = join(
        input.previewOutputDir,
        `preview-${inputValue.theme.slug}-${inputValue.draft.issueDate}-v${inputValue.draft.version}.html`,
      )
      writeFileSync(previewPath, inputValue.html, 'utf8')
      return previewPath
    },
    async confirm(message) {
      input.calls.push({ name: 'runtime.confirm', input: { message } })
      return true
    },
  }
}
