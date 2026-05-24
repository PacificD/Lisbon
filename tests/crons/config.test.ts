import { describe, expect, it } from 'vitest'

import { cronConfigSchema, cronEnvSchema, resolveTaskConfig } from '../../apps/crons/src/config.ts'

describe('cron config', () => {
  it('validates recipients, timezone, and task schedule', () => {
    const config = cronConfigSchema.parse({
      timezone: 'Asia/Shanghai',
      recipients: ['reader@example.com'],
      tasks: [
        {
          name: 'daily-us-market-overview',
          hhmm: '0800',
          enabled: true,
          prompt: 'prompts/daily-us-market-overview.md',
          transformPrompt: 'prompts/market-md-to-newsletter-json.md',
        },
      ],
    })

    expect(config.timezone).toBe('Asia/Shanghai')
    expect(config.recipients).toEqual(['reader@example.com'])
    expect(resolveTaskConfig(config, 'daily-us-market-overview')?.hhmm).toBe('0800')
  })

  it('rejects malformed hhmm values', () => {
    expect(() =>
      cronConfigSchema.parse({
        timezone: 'Asia/Shanghai',
        recipients: ['reader@example.com'],
        tasks: [
          {
            name: 'daily-us-market-overview',
            hhmm: '2460',
            enabled: true,
            prompt: 'prompts/a.md',
            transformPrompt: 'prompts/b.md',
          },
        ],
      }),
    ).toThrow()
  })

  it('loads env defaults without recipient configuration', () => {
    const env = cronEnvSchema.parse({
      RESEND_API_KEY: 'resend-key',
      MAIL_FROM: 'Lisbon <news@example.com>',
    })

    expect(env.CODEX_BIN).toBe('codex')
    expect(env.CRONS_ARTIFACTS_DIR).toBe('apps/crons/artifacts')
  })
})
