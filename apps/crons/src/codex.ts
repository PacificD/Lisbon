import { spawn } from 'node:child_process'

export interface CodexExecutor {
  exec(prompt: string, input?: string): Promise<string>
}

export function createCodexExecutor(codexBin = 'codex'): CodexExecutor {
  return {
    exec(prompt, input) {
      return new Promise((resolve, reject) => {
        const child = spawn(codexBin, ['exec', prompt], {
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        let stdout = ''
        let stderr = ''

        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        child.stdout.on('data', (chunk) => {
          stdout += chunk
        })
        child.stderr.on('data', (chunk) => {
          stderr += chunk
        })
        child.on('error', reject)
        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout.trim())
            return
          }

          reject(new Error(`codex exec failed with exit code ${code}: ${stderr.trim()}`))
        })

        if (input) {
          child.stdin.write(input)
        }

        child.stdin.end()
      })
    },
  }
}

export function buildTransformInput(markdown: string): string {
  return `将以下 Markdown 转换为邮件 JSON：\n\n${markdown}`
}
