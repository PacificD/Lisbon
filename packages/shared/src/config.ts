import { NewsletterConfigSchema, type NewsletterConfig } from './types.ts'

export function loadConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): NewsletterConfig {
  return NewsletterConfigSchema.parse(env)
}
