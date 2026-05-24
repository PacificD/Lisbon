import { createResendSender } from '@lisbon/integrations-resend'

import { createCodexExecutor } from './codex.js'
import { loadCronConfig, loadCronEnv } from './config.js'
import { DAILY_US_MARKET_TASK_NAME, runDailyUsMarketOverviewTask } from './tasks/daily-us-market-overview.js'

async function main(argv: string[]): Promise<void> {
  const [command, taskName, ...rest] = argv

  if (command !== 'task' || !taskName) {
    throw new Error('Usage: pnpm --filter @lisbon/crons task <task-name> [--force]')
  }

  const force = rest.includes('--force')
  const config = await loadCronConfig()
  const env = loadCronEnv()
  const codex = createCodexExecutor(env.CODEX_BIN)
  const emailSender = createResendSender(env.RESEND_API_KEY)

  switch (taskName) {
    case DAILY_US_MARKET_TASK_NAME: {
      const result = await runDailyUsMarketOverviewTask({
        config,
        env,
        codex,
        emailSender,
        force,
      })
      process.stdout.write(`${result.status}: ${taskName}\n`)
      return
    }
    default:
      throw new Error(`Unknown cron task: ${taskName}`)
  }
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
