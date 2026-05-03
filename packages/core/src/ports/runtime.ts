import type { NewsletterConfig, WorkflowResult } from '@lisbon/shared'
import type { Theme } from '../domain/theme.js'

export interface WorkflowRunner {
  metadata: {
    name: string
    displayName: string
    description: string
  }
  run(input: {
    theme: Theme
    issueDate: string
    config: NewsletterConfig
  }): Promise<WorkflowResult>
}

export interface WorkflowRegistry {
  getWorkflow(name: string): WorkflowRunner | undefined
}

export interface DraftRenderer {
  render(input: { theme: Theme; result: WorkflowResult }): Promise<string>
  renderHtml(input: { theme: Theme; result: WorkflowResult }): Promise<string>
  renderText(input: { theme: Theme; result: WorkflowResult }): string
}

export interface EmailSender {
  send(message: {
    from: string
    to: string[]
    subject: string
    html: string
    text?: string
  }): Promise<{ provider: 'resend'; providerMessageId: string }>
}
