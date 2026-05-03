import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import { createDraftService, createSendService, createSubscriberService, createThemeService } from '@lisbon/core'
import type { DraftService, NewsletterDraft, SendService, SubscriberService, ThemeService } from '@lisbon/core'
import { createSupabaseAdminClient } from '@lisbon/db/client'
import { createDraftRepository } from '@lisbon/db/repositories/draft'
import { createSubscriberRepository } from '@lisbon/db/repositories/subscriber'
import { createThemeRepository } from '@lisbon/db/repositories/theme'
import { draftRenderer } from '@lisbon/email'
import { createResendSender } from '@lisbon/integrations-resend'
import { loadConfig } from '@lisbon/shared'
import type { NewsletterConfig } from '@lisbon/shared'
import { workflowRegistry } from '@lisbon/workflows'

export interface CliRuntime {
  config: NewsletterConfig
  draftService: DraftService
  sendService: SendService
  subscriberService: SubscriberService
  themeService: ThemeService
  confirm(message: string): Promise<boolean>
  getDefaultIssueDate(): string
  writePreview(input: {
    draft: NewsletterDraft
    html: string
    theme: { slug: string }
  }): Promise<string>
}

export function createCliRuntime(env: NodeJS.ProcessEnv = process.env): CliRuntime {
  const config = loadConfig(env)
  const client = createSupabaseAdminClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
  const themeRepository = createThemeRepository(client)
  const subscriberRepository = createSubscriberRepository(client)
  const draftRepository = createDraftRepository(client)
  const emailSender = createResendSender(config.RESEND_API_KEY)

  return {
    config,
    themeService: createThemeService(themeRepository, workflowRegistry),
    subscriberService: createSubscriberService(themeRepository, subscriberRepository),
    draftService: createDraftService(themeRepository, draftRepository, workflowRegistry, draftRenderer),
    sendService: createSendService(
      themeRepository,
      subscriberRepository,
      draftRepository,
      emailSender,
      draftRenderer,
      config.MAIL_FROM,
    ),
    async confirm(message) {
      const readline = createInterface({ input, output })

      try {
        const response = await readline.question(`${message} [y/N] `)
        return /^y(es)?$/i.test(response.trim())
      } finally {
        readline.close()
      }
    },
    getDefaultIssueDate() {
      return formatIssueDate(new Date(), config.DEFAULT_ISSUE_DATE_TIMEZONE)
    },
    async writePreview({ draft, html, theme }) {
      await mkdir(config.PREVIEW_OUTPUT_DIR, { recursive: true })

      const previewPath = join(
        config.PREVIEW_OUTPUT_DIR,
        `${theme.slug}-${draft.issueDate}-v${draft.version}.html`,
      )

      await writeFile(previewPath, html, 'utf8')
      return previewPath
    },
  }
}

function formatIssueDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error(`Could not format issue date for ${timeZone}.`)
  }

  return `${year}-${month}-${day}`
}
