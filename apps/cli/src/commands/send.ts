import type { CommandModule } from './types.js'
import { assertNoPositionals, hasFlag, parseArgs, parseDraftSelector, requireOption, resolveIssueDate } from './types.js'

export const sendCommand: CommandModule = {
  async run(argv, runtime) {
    const [action, ...rest] = argv

    switch (action) {
      case 'issue':
        return sendIssue(rest, runtime)
      default:
        throw new Error('Unknown send command.')
    }
  },
}

async function sendIssue(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const themeSlug = requireOption(parsedArgs, 'theme')
  const issueDate = resolveIssueDate(parsedArgs, runtime)
  const selector = parseDraftSelector(parsedArgs)

  if (!hasFlag(parsedArgs, 'yes')) {
    const confirmed = await runtime.confirm(`Send approved issue for theme ${themeSlug} on ${issueDate}?`)

    if (!confirmed) {
      return 'Send cancelled.'
    }
  }

  const draft = await runtime.sendService.send({
    themeSlug,
    issueDate,
    ...selector,
  })

  return `Sent issue ${draft.id} via ${draft.sendProvider}.`
}
