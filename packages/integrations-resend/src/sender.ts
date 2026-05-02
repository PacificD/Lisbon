import { Resend } from 'resend'

import type { EmailSender } from '@lisbon/core'

interface ResendClient {
  emails: {
    send(message: {
      from: string
      to: string[]
      subject: string
      html: string
      text?: string
    }): Promise<{
      data?: { id?: string | null } | null
      error?: { message: string } | null
    }>
  }
}

export function createResendEmailSender(input: {
  apiKey: string
  client?: ResendClient
}): EmailSender {
  const client = input.client ?? new Resend(input.apiKey)

  return {
    async send(message) {
      const response = await client.emails.send({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      const providerMessageId = response.data?.id

      if (!providerMessageId) {
        throw new Error('Resend did not return a provider message id.')
      }

      return { providerMessageId }
    },
  }
}
