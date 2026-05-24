import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { EmailSender } from '@lisbon/core'
import { renderCronNewsletterContent } from '@lisbon/email'

import {
  createRunLock,
  getArtifactPaths,
  readRunState,
  shouldSkipSentRun,
  writeArtifact,
  writeRunState,
} from '../artifacts.js'
import { buildTransformInput } from '../codex.js'
import type { CodexExecutor } from '../codex.js'
import { resolveTaskConfig } from '../config.js'
import type { CronConfig, CronEnv } from '../config.js'
import { parseNewsletterJson } from '../newsletter-json.js'

export const DAILY_US_MARKET_TASK_NAME = 'daily-us-market-overview'

export interface DailyUsMarketOverviewInput {
  config: CronConfig
  env: CronEnv
  codex: CodexExecutor
  emailSender: EmailSender
  now?: Date
  force?: boolean
}

export async function runDailyUsMarketOverviewTask(input: DailyUsMarketOverviewInput) {
  const now = input.now ?? new Date()
  const force = input.force ?? false
  const date = formatDateInTimeZone(now, input.config.timezone)
  const task = resolveTaskConfig(input.config, DAILY_US_MARKET_TASK_NAME)

  if (!task) {
    throw new Error(`Task ${DAILY_US_MARKET_TASK_NAME} was not found in apps/crons/config.json.`)
  }

  if (!task.enabled) {
    throw new Error(`Task ${DAILY_US_MARKET_TASK_NAME} is disabled.`)
  }

  const paths = getArtifactPaths({
    root: input.env.CRONS_ARTIFACTS_DIR,
    taskName: DAILY_US_MARKET_TASK_NAME,
    date,
  })
  const existingState = await readRunState(paths)

  if (shouldSkipSentRun(existingState, force)) {
    const skippedState = {
      status: 'skipped' as const,
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt: now.toISOString(),
      finishedAt: now.toISOString(),
      provider: existingState?.provider,
      providerMessageId: existingState?.providerMessageId,
    }
    await writeRunState(paths, skippedState)
    return skippedState
  }

  const lock = await createRunLock(paths)
  const startedAt = now.toISOString()

  try {
    await writeRunState(paths, {
      status: 'running',
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt,
    })

    const sourcePrompt = await readFile(resolve(task.prompt), 'utf8')
    const sourceMarkdown = await input.codex.exec(sourcePrompt)
    await writeArtifact(paths.sourceMarkdown, sourceMarkdown)

    const transformPrompt = await readFile(resolve(task.transformPrompt), 'utf8')
    const rawNewsletterOutput = await input.codex.exec(transformPrompt, buildTransformInput(sourceMarkdown))
    await writeArtifact(paths.rawNewsletterOutput, rawNewsletterOutput)

    const newsletter = parseNewsletterJson(rawNewsletterOutput)
    await writeArtifact(paths.newsletterJson, `${JSON.stringify(newsletter, null, 2)}\n`)

    const rendered = await renderCronNewsletterContent(newsletter)
    await writeArtifact(paths.emailHtml, rendered.html)
    await writeArtifact(paths.emailText, rendered.text)

    const sendResult = await input.emailSender.send({
      from: input.env.MAIL_FROM,
      to: input.config.recipients,
      subject: newsletter.subject,
      html: rendered.html,
      text: rendered.text,
    })

    const sentState = {
      status: 'sent' as const,
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt,
      finishedAt: new Date().toISOString(),
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
    }
    await writeRunState(paths, sentState)
    return sentState
  } catch (error) {
    const failedState = {
      status: 'failed' as const,
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt,
      finishedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown task failure',
    }
    await writeRunState(paths, failedState)
    throw error
  } finally {
    await lock.release()
  }
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
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
    throw new Error(`Could not format run date for ${timeZone}.`)
  }

  return `${year}-${month}-${day}`
}
