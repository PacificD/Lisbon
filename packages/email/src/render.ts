import { createElement } from 'react'
import { render } from '@react-email/render'

import type { Theme } from '@lisbon/core'
import type { WorkflowResult } from '@lisbon/shared'

import { NewsletterTemplate } from './templates/newsletter.js'
import { renderNewsletterText } from './text.js'

async function renderEmailTemplate(input: { theme: Theme; result: WorkflowResult }): Promise<string> {
  return render(createElement(NewsletterTemplate, input))
}

export function renderNewsletterHtml(input: { theme: Theme; result: WorkflowResult }): Promise<string> {
  return renderEmailTemplate(input)
}

export function renderNewsletterTextContent(input: { theme: Theme; result: WorkflowResult }): string {
  return renderNewsletterText(input)
}

interface DraftRendererContract {
  render(input: { theme: Theme; result: WorkflowResult }): Promise<string>
  renderHtml(input: { theme: Theme; result: WorkflowResult }): Promise<string>
  renderText(input: { theme: Theme; result: WorkflowResult }): string
}

export const draftRenderer: DraftRendererContract = {
  render(input: { theme: Theme; result: WorkflowResult }) {
    return renderNewsletterHtml(input)
  },
  renderHtml(input: { theme: Theme; result: WorkflowResult }) {
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
