import { z } from 'zod'

export const newsletterConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  PREVIEW_OUTPUT_DIR: z.string().min(1),
  DEFAULT_ISSUE_DATE_TIMEZONE: z.string().min(1).default('Asia/Shanghai'),
})

export type NewsletterConfig = z.infer<typeof newsletterConfigSchema>

export function loadConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): NewsletterConfig {
  return newsletterConfigSchema.parse(env)
}
