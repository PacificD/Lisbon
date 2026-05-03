import { draftCommand } from './commands/draft.js'
import { sendCommand } from './commands/send.js'
import type { CommandModule } from './commands/types.js'
import { subscriberCommand } from './commands/subscriber.js'
import { themeCommand } from './commands/theme.js'
import type { CliRuntime } from './runtime.js'

const commandMap: Record<string, CommandModule> = {
  draft: draftCommand,
  send: sendCommand,
  subscriber: subscriberCommand,
  theme: themeCommand,
}

export interface CliApp {
  run(argv: string[]): Promise<string>
}

export function createCliApp(runtime: CliRuntime): CliApp {
  return {
    async run(argv) {
      const [namespace, ...rest] = argv

      if (!namespace) {
        return renderUsage()
      }

      const command = commandMap[namespace]

      if (!command) {
        throw new Error(`Unknown command group ${namespace}.`)
      }

      return command.run(rest, runtime)
    },
  }
}

function renderUsage(): string {
  return [
    'Lisbon newsletter CLI',
    'Commands:',
    '  theme create|list|update',
    '  subscriber add|list|remove',
    '  draft generate|list|show|approve',
    '  send issue',
  ].join('\n')
}
