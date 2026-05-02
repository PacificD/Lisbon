import type {
  ThemeRecord,
  WorkflowMetadata,
  WorkflowResult,
} from '../../../shared/src/schemas.ts'
import type { NewsletterConfig, SendProvider } from '../../../shared/src/types.ts'

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

export interface WorkflowRunInput {
  theme: ThemeRecord
  issueDate: string
  config: NewsletterConfig
  logger: Logger
}

export interface WorkflowDefinition {
  metadata: WorkflowMetadata
  run(input: WorkflowRunInput): Promise<WorkflowResult>
}

export interface WorkflowRegistry {
  getWorkflow(name: string): WorkflowDefinition | undefined
}

export interface EmailMessage {
  from: string
  to: string[]
  subject: string
  html: string
  text?: string
}

export interface EmailSendResult {
  provider: SendProvider
  providerMessageId: string
}

export interface EmailSender {
  send(message: EmailMessage): Promise<EmailSendResult>
}
