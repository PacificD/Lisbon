import { z } from 'zod'

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export const newsletterConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  PREVIEW_OUTPUT_DIR: z.string().min(1),
  DEFAULT_ISSUE_DATE_TIMEZONE: z
    .string()
    .min(1)
    .refine(isValidTimeZone, 'Expected a valid time zone')
    .default('Asia/Shanghai'),
})

export type NewsletterConfig = z.infer<typeof newsletterConfigSchema>

export function loadConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): NewsletterConfig {
  return newsletterConfigSchema.parse(env)
}
