import { z } from 'zod'

export const DEFAULT_ISSUE_DATE_TIMEZONE = 'Asia/Shanghai'

export const NewsletterConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  PREVIEW_OUTPUT_DIR: z.string().min(1),
  DEFAULT_ISSUE_DATE_TIMEZONE: z.string().min(1).default(DEFAULT_ISSUE_DATE_TIMEZONE),
})

export const DraftStatusSchema = z.enum(['draft', 'approved', 'sent', 'failed'])
export const SendProviderSchema = z.enum(['resend'])

export type NewsletterConfig = z.infer<typeof NewsletterConfigSchema>
export type DraftStatus = z.infer<typeof DraftStatusSchema>
export type SendProvider = z.infer<typeof SendProviderSchema>
