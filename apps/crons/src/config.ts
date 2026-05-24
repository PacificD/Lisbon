import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { z } from 'zod'

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export const cronTaskConfigSchema = z.object({
  name: z.string().min(1),
  hhmm: z.string().regex(/^([01]\d|2[0-3])[0-5]\d$/, 'Expected hhmm in 0000-2359 format'),
  enabled: z.boolean(),
  prompt: z.string().min(1),
  transformPrompt: z.string().min(1),
})

export const cronConfigSchema = z.object({
  timezone: z.string().min(1).refine(isValidTimeZone, 'Expected a valid time zone'),
  recipients: z.array(z.string().email()).min(1),
  tasks: z.array(cronTaskConfigSchema).min(1),
})

export const cronEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  CODEX_BIN: z.string().min(1).default('codex'),
  CRONS_ARTIFACTS_DIR: z.string().min(1).default('apps/crons/artifacts'),
})

export type CronConfig = z.infer<typeof cronConfigSchema>
export type CronTaskConfig = z.infer<typeof cronTaskConfigSchema>
export type CronEnv = z.infer<typeof cronEnvSchema>

export async function loadCronConfig(path = 'apps/crons/config.json'): Promise<CronConfig> {
  const raw = await readFile(resolve(path), 'utf8')
  return cronConfigSchema.parse(JSON.parse(raw))
}

export function loadCronEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): CronEnv {
  return cronEnvSchema.parse(env)
}

export function resolveTaskConfig(config: CronConfig, taskName: string): CronTaskConfig | undefined {
  return config.tasks.find((task) => task.name === taskName)
}
