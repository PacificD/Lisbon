import type { CommandModule } from './types.js'
import {
  assertNoPositionals,
  hasFlag,
  parseArgs,
  parseDraftSelector,
  pickDraft,
  requireIssueDate,
  requireOption,
  resolveIssueDate,
} from './types.js'

export const draftCommand: CommandModule = {
  async run(argv, runtime) {
    const [action, ...rest] = argv

    switch (action) {
      case 'approve':
        return approveDraft(rest, runtime)
      case 'generate':
        return generateDraft(rest, runtime)
      case 'list':
        return listDrafts(rest, runtime)
      case 'show':
        return showDraft(rest, runtime)
      default:
        throw new Error('Unknown draft command.')
    }
  },
}

async function generateDraft(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const issueDate = resolveIssueDate(parsedArgs, runtime)
  const draft = await runtime.draftService.generate({
    themeSlug: requireOption(parsedArgs, 'theme'),
    issueDate,
    config: runtime.config,
  })

  return `Generated draft ${draft.id} for ${issueDate} version ${draft.version}.`
}

async function listDrafts(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const drafts = await runtime.draftService.list({
    themeSlug: requireOption(parsedArgs, 'theme'),
    issueDate: resolveIssueDate(parsedArgs, runtime),
  })

  if (drafts.length === 0) {
    return 'No drafts found.'
  }

  return drafts
    .map((draft) => `version ${draft.version}\t${draft.status}\t${draft.subject}`)
    .join('\n')
}

async function showDraft(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const themeSlug = requireOption(parsedArgs, 'theme')
  const issueDate = requireIssueDate(parsedArgs)
  const drafts = await runtime.draftService.list({
    themeSlug,
    issueDate,
  })
  const draft = pickDraft(drafts, parseDraftSelector(parsedArgs))
  const lines = [
    `Draft ${draft.id}`,
    `Theme: ${themeSlug}`,
    `Issue Date: ${draft.issueDate}`,
    `Version: ${draft.version}`,
    `Status: ${draft.status}`,
    `Subject: ${draft.subject}`,
    `Preview Text: ${draft.previewText}`,
  ]

  if (hasFlag(parsedArgs, 'write-preview')) {
    const previewPath = await runtime.writePreview({
      draft,
      html: draft.renderedHtml,
      theme: { slug: themeSlug },
    })
    lines.push(`Preview: ${previewPath}`)
  }

  return lines.join('\n')
}

async function approveDraft(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const themeSlug = requireOption(parsedArgs, 'theme')
  const issueDate = requireIssueDate(parsedArgs)
  const selector = parseDraftSelector(parsedArgs)
  const draft = await runtime.sendService.approve({
    themeSlug,
    issueDate,
    ...selector,
  })

  return `Approved draft ${draft.id} for ${themeSlug} on ${issueDate}.`
}
