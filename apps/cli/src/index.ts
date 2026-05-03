import { createCliApp } from './app.js'
import { createCliRuntime } from './runtime.js'

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const output = await createCliApp(createCliRuntime()).run(argv)

    if (output.length > 0) {
      process.stdout.write(`${output}\n`)
    }

    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    return 1
  }
}

const isEntryPoint = import.meta.url === new URL(process.argv[1], 'file:').href

if (isEntryPoint) {
  main().then((exitCode) => {
    process.exitCode = exitCode
  })
}
