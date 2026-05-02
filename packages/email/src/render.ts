import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import type { DraftRenderer, Theme } from '@lisbon/core'
import type { WorkflowResult } from '@lisbon/shared'

import { NewsletterTemplate } from './templates/newsletter.js'
import { renderNewsletterText } from './text.js'

export function renderNewsletterHtml(input: { theme: Theme; result: WorkflowResult }): string {
  const markup = renderToStaticMarkup(createElement(NewsletterTemplate, input))
  return `<!DOCTYPE html>${markup}`
}

export function renderNewsletterContent(input: { theme: Theme; result: WorkflowResult }) {
  return {
    html: renderNewsletterHtml(input),
    text: renderNewsletterText(input),
  }
}

export function createNewsletterRenderer(): DraftRenderer {
  return {
    render(input) {
      return renderNewsletterHtml(input)
    },
  }
}
