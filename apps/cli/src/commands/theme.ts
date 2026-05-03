import type { CommandModule } from './types.js'
import { assertNoPositionals, parseArgs, parseBooleanOption, requireOption, optionalOption } from './types.js'

export const themeCommand: CommandModule = {
  async run(argv, runtime) {
    const [action, ...rest] = argv

    switch (action) {
      case 'create':
        return createTheme(rest, runtime)
      case 'list':
        return listThemes(rest, runtime)
      case 'update':
        return updateTheme(rest, runtime)
      default:
        throw new Error('Unknown theme command.')
    }
  },
}

async function createTheme(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const theme = await runtime.themeService.createTheme({
    slug: requireOption(parsedArgs, 'slug'),
    name: requireOption(parsedArgs, 'name'),
    workflowName: requireOption(parsedArgs, 'workflow'),
  })

  return `Created theme ${theme.slug} (${theme.name}) using workflow ${theme.workflowName}.`
}

async function listThemes(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const themes = await runtime.themeService.listThemes()

  if (themes.length === 0) {
    return 'No themes found.'
  }

  return themes
    .map((theme) => `${theme.slug}\t${theme.name}\t${theme.workflowName}\t${theme.enabled ? 'enabled' : 'disabled'}`)
    .join('\n')
}

async function updateTheme(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const slug = requireOption(parsedArgs, 'slug')
  const name = optionalOption(parsedArgs, 'name')
  const workflowName = optionalOption(parsedArgs, 'workflow')
  const enabled = parseBooleanOption(parsedArgs, 'enabled')

  if (name === undefined && workflowName === undefined && enabled === undefined) {
    throw new Error('Provide at least one update option.')
  }

  const theme = await runtime.themeService.updateTheme({
    slug,
    ...(name !== undefined ? { name } : {}),
    ...(workflowName !== undefined ? { workflowName } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
  })

  return `Updated theme ${theme.slug}.`
}
