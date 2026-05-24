import { createElement } from 'react'
import { render } from '@react-email/render'

import type { DraftRenderer, Theme } from '@lisbon/core'
import type { WorkflowResult } from '@lisbon/shared'

import { renderCronNewsletterText } from './cron-text.js'
import { CronNewsletterTemplate } from './templates/cron-newsletter.js'
import type { CronNewsletterContent, CronNewsletterSection } from './templates/cron-newsletter.js'
import { NewsletterTemplate } from './templates/newsletter.js'
import { renderNewsletterText } from './text.js'

export type { CronNewsletterContent, CronNewsletterSection }

async function renderEmailTemplate(input: { theme: Theme; result: WorkflowResult }): Promise<string> {
  return render(createElement(NewsletterTemplate, input))
}

export function renderNewsletterHtml(input: { theme: Theme; result: WorkflowResult }): Promise<string> {
  return renderEmailTemplate(input)
}

export function renderNewsletterTextContent(input: { theme: Theme; result: WorkflowResult }): string {
  return renderNewsletterText(input)
}

export const draftRenderer: DraftRenderer = {
  render(input) {
    return renderNewsletterHtml(input)
  },
  renderHtml(input) {
    return renderNewsletterHtml(input)
  },
  renderText(input) {
    return renderNewsletterTextContent(input)
  },
}

export async function renderNewsletterContent(input: { theme: Theme; result: WorkflowResult }) {
  return {
    html: await draftRenderer.renderHtml(input),
    text: draftRenderer.renderText(input),
  }
}

export async function renderCronNewsletterContent(content: CronNewsletterContent) {
  return {
    html: await render(createElement(CronNewsletterTemplate, { content })),
    text: renderCronNewsletterText(content),
  }
}
