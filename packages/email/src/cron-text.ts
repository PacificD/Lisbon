import type { CronNewsletterContent } from './templates/cron-newsletter.js'

export function renderCronNewsletterText(content: CronNewsletterContent): string {
  const lines = [
    content.subject,
    content.previewText,
    '',
    content.intro,
    '',
    ...content.sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []).map((bullet) => `- ${bullet}`),
      '',
    ]),
  ]

  return lines.filter((line, index, allLines) => line !== '' || allLines[index - 1] !== '').join('\n').trim()
}
