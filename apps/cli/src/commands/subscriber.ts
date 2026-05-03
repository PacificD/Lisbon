import type { CommandModule } from './types.js'
import { assertNoPositionals, parseArgs, requireOption } from './types.js'

export const subscriberCommand: CommandModule = {
  async run(argv, runtime) {
    const [action, ...rest] = argv

    switch (action) {
      case 'add':
        return addSubscriber(rest, runtime)
      case 'list':
        return listSubscribers(rest, runtime)
      case 'remove':
        return removeSubscriber(rest, runtime)
      default:
        throw new Error('Unknown subscriber command.')
    }
  },
}

async function addSubscriber(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const subscriber = await runtime.subscriberService.addSubscriber({
    themeSlug: requireOption(parsedArgs, 'theme'),
    email: requireOption(parsedArgs, 'email'),
  })

  return `Added subscriber ${subscriber.email}.`
}

async function listSubscribers(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const subscribers = await runtime.subscriberService.listSubscribers({
    themeSlug: requireOption(parsedArgs, 'theme'),
  })

  if (subscribers.length === 0) {
    return 'No subscribers found.'
  }

  return subscribers.map((subscriber) => subscriber.email).join('\n')
}

async function removeSubscriber(argv: string[], runtime: Parameters<CommandModule['run']>[1]): Promise<string> {
  const parsedArgs = parseArgs(argv)
  assertNoPositionals(parsedArgs)

  const themeSlug = requireOption(parsedArgs, 'theme')
  const email = requireOption(parsedArgs, 'email')

  await runtime.subscriberService.removeSubscriber({
    themeSlug,
    email,
  })

  return `Removed subscriber ${email} from ${themeSlug}.`
}
