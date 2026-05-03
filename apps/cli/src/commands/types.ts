import type { NewsletterDraft, SendService, SubscriberService, ThemeService } from '@lisbon/core'
import type { DraftService } from '@lisbon/core'

import type { CliRuntime } from '../runtime.js'

export interface ParsedArgs {
  options: Record<string, string | boolean>
  positionals: string[]
}

export interface CommandModule {
  run(argv: string[], runtime: CliRuntime): Promise<string>
}

export interface DraftSelector {
  draftId?: string
  version?: number
}

export interface CommandServices {
  draftService: DraftService
  sendService: SendService
  subscriberService: SubscriberService
  themeService: ThemeService
}

export function parseArgs(argv: string[]): ParsedArgs {
  const options: Record<string, string | boolean> = {}
  const positionals: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }

    const optionName = token.slice(2)
    const nextToken = argv[index + 1]

    if (!nextToken || nextToken.startsWith('--')) {
      options[optionName] = true
      continue
    }

    options[optionName] = nextToken
    index += 1
  }

  return { options, positionals }
}

export function requireOption(parsedArgs: ParsedArgs, name: string): string {
  const value = parsedArgs.options[name]

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required option --${name}.`)
  }

  return value
}

export function optionalOption(parsedArgs: ParsedArgs, name: string): string | undefined {
  const value = parsedArgs.options[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function hasFlag(parsedArgs: ParsedArgs, name: string): boolean {
  return parsedArgs.options[name] === true
}

export function parseBooleanOption(parsedArgs: ParsedArgs, name: string): boolean | undefined {
  const value = optionalOption(parsedArgs, name)

  if (value === undefined) {
    return undefined
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw new Error(`Option --${name} must be true or false.`)
}

export function parseNumberOption(parsedArgs: ParsedArgs, name: string): number | undefined {
  const value = optionalOption(parsedArgs, name)

  if (value === undefined) {
    return undefined
  }

  const parsedValue = Number.parseInt(value, 10)

  if (!Number.isInteger(parsedValue)) {
    throw new Error(`Option --${name} must be an integer.`)
  }

  return parsedValue
}

export function assertNoPositionals(parsedArgs: ParsedArgs): void {
  if (parsedArgs.positionals.length > 0) {
    throw new Error(`Unexpected arguments: ${parsedArgs.positionals.join(' ')}`)
  }
}

export function resolveIssueDate(parsedArgs: ParsedArgs, runtime: CliRuntime): string {
  return optionalOption(parsedArgs, 'date') ?? runtime.getDefaultIssueDate()
}

export function parseDraftSelector(parsedArgs: ParsedArgs): DraftSelector {
  const draftId = optionalOption(parsedArgs, 'id')
  const version = parseNumberOption(parsedArgs, 'version')

  if (draftId && version !== undefined) {
    throw new Error('Use either --id or --version, not both.')
  }

  return {
    ...(draftId ? { draftId } : {}),
    ...(version !== undefined ? { version } : {}),
  }
}

export function pickDraft(drafts: NewsletterDraft[], selector: DraftSelector): NewsletterDraft {
  if (selector.draftId) {
    const selectedDraft = drafts.find((draft) => draft.id === selector.draftId)

    if (!selectedDraft) {
      throw new Error(`Draft ${selector.draftId} was not found.`)
    }

    return selectedDraft
  }

  if (selector.version !== undefined) {
    const selectedDraft = drafts.find((draft) => draft.version === selector.version)

    if (!selectedDraft) {
      throw new Error(`Draft version ${selector.version} was not found.`)
    }

    return selectedDraft
  }

  if (drafts.length === 0) {
    throw new Error('No drafts found.')
  }

  return drafts.reduce((latestDraft, draft) => (draft.version > latestDraft.version ? draft : latestDraft))
}
