import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getArtifactPaths, writeRunState } from '../../apps/crons/src/artifacts.ts'
import type { CodexExecutor } from '../../apps/crons/src/codex.ts'
import type { CronConfig, CronEnv } from '../../apps/crons/src/config.ts'
import { runDailyUsMarketOverviewTask } from '../../apps/crons/src/tasks/daily-us-market-overview.ts'

let tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
  tempDirs = []
})

async function makeRoot() {
  const dir = await mkdtemp(join(tmpdir(), 'lisbon-crons-task-'))
  tempDirs.push(dir)
  return dir
}

function makeConfig(root: string): { config: CronConfig; env: CronEnv } {
  return {
    config: {
      timezone: 'Asia/Shanghai',
      recipients: ['reader@example.com'],
      tasks: [
        {
          name: 'daily-us-market-overview',
          hhmm: '0800',
          enabled: true,
          prompt: 'apps/crons/prompts/daily-us-market-overview.md',
          transformPrompt: 'apps/crons/prompts/market-md-to-newsletter-json.md',
        },
      ],
    },
    env: {
      RESEND_API_KEY: 'resend-key',
      MAIL_FROM: 'Lisbon <news@example.com>',
      CODEX_BIN: 'codex',
      CRONS_ARTIFACTS_DIR: root,
    },
  }
}

describe('daily US market overview task', () => {
  it('runs both Codex passes, renders artifacts, and sends email', async () => {
    const root = await makeRoot()
    const { config, env } = makeConfig(root)
    const codex: CodexExecutor = {
      exec: vi
        .fn()
        .mockResolvedValueOnce('# 昨日美股收盘概览\n\n三大指数收跌。')
        .mockResolvedValueOnce(
          JSON.stringify({
            subject: '昨日美股收盘概览',
            previewText: '三大指数收跌。',
            intro: '以下为重点摘要。',
            sections: [{ heading: '市场概览', paragraphs: ['三大指数收跌。'], bullets: ['科技股承压'] }],
          }),
        ),
    }
    const send = vi.fn().mockResolvedValue({ provider: 'resend' as const, providerMessageId: 'email-id' })

    const result = await runDailyUsMarketOverviewTask({
      config,
      env,
      codex,
      emailSender: { send },
      now: new Date('2026-05-24T00:05:00.000Z'),
      force: false,
    })

    expect(result.status).toBe('sent')
    expect(codex.exec).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Lisbon <news@example.com>',
        to: ['reader@example.com'],
        subject: '昨日美股收盘概览',
      }),
    )

    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })
    await expect(readFile(paths.sourceMarkdown, 'utf8')).resolves.toContain('三大指数收跌')
    await expect(readFile(paths.newsletterJson, 'utf8')).resolves.toContain('市场概览')
    await expect(readFile(paths.emailHtml, 'utf8')).resolves.toContain('昨日美股收盘概览')
    await expect(readFile(paths.emailText, 'utf8')).resolves.toContain('- 科技股承压')
    await expect(readFile(paths.runState, 'utf8')).resolves.toContain('email-id')
  })

  it('skips an already sent run without force', async () => {
    const root = await makeRoot()
    const { config, env } = makeConfig(root)
    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })
    await writeRunState(paths, {
      status: 'sent',
      taskName: 'daily-us-market-overview',
      date: '2026-05-24',
      provider: 'resend',
      providerMessageId: 'existing-id',
    })
    const codex: CodexExecutor = { exec: vi.fn() }
    const send = vi.fn()

    const result = await runDailyUsMarketOverviewTask({
      config,
      env,
      codex,
      emailSender: { send },
      now: new Date('2026-05-24T00:05:00.000Z'),
      force: false,
    })

    expect(result.status).toBe('skipped')
    expect(codex.exec).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('records invalid JSON failures and does not send', async () => {
    const root = await makeRoot()
    const { config, env } = makeConfig(root)
    const codex: CodexExecutor = {
      exec: vi.fn().mockResolvedValueOnce('# source').mockResolvedValueOnce('not json'),
    }
    const send = vi.fn()

    await expect(
      runDailyUsMarketOverviewTask({
        config,
        env,
        codex,
        emailSender: { send },
        now: new Date('2026-05-24T00:05:00.000Z'),
        force: false,
      }),
    ).rejects.toThrow('Codex output was not valid JSON')

    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })
    await expect(readFile(paths.rawNewsletterOutput, 'utf8')).resolves.toBe('not json')
    await expect(readFile(paths.runState, 'utf8')).resolves.toContain('"status": "failed"')
    expect(send).not.toHaveBeenCalled()
  })
})
