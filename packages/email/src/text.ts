import type { Theme } from '@lisbon/core'
import type { WorkflowResult } from '@lisbon/shared'

export function renderNewsletterText(input: { theme: Theme; result: WorkflowResult }): string {
  const lines = [
    `${input.theme.name}: ${input.result.subject}`,
    input.result.previewText,
    '',
    input.result.intro,
    '',
    ...input.result.items.flatMap((item, index) => [
      `${index + 1}. ${item.title}`,
      `Source: ${item.source}`,
      `Summary: ${item.summary}`,
      `URL: ${item.url}`,
      item.author ? `Author: ${item.author}` : '',
      item.publishedAt ? `Published: ${item.publishedAt}` : '',
      item.tags?.length ? `Tags: ${item.tags.join(', ')}` : '',
      '',
    ]),
  ]

  return lines.filter((line, index, allLines) => line !== '' || allLines[index - 1] !== '').join('\n').trim()
}
