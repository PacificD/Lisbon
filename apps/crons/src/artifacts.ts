import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type RunStatus = 'running' | 'sent' | 'failed' | 'skipped'

export interface RunState {
  status: RunStatus
  taskName: string
  date: string
  startedAt?: string
  finishedAt?: string
  provider?: 'resend'
  providerMessageId?: string
  errorMessage?: string
}

export interface ArtifactPaths {
  dir: string
  lock: string
  sourceMarkdown: string
  newsletterJson: string
  rawNewsletterOutput: string
  emailHtml: string
  emailText: string
  runState: string
}

export function getArtifactPaths(input: { root: string; taskName: string; date: string }): ArtifactPaths {
  const dir = join(input.root, input.taskName, input.date)

  return {
    dir,
    lock: join(dir, '.running.lock'),
    sourceMarkdown: join(dir, 'source.md'),
    newsletterJson: join(dir, 'newsletter.json'),
    rawNewsletterOutput: join(dir, 'newsletter.raw.txt'),
    emailHtml: join(dir, 'email.html'),
    emailText: join(dir, 'email.txt'),
    runState: join(dir, 'run.json'),
  }
}

export async function ensureArtifactDir(paths: ArtifactPaths): Promise<void> {
  await mkdir(paths.dir, { recursive: true })
}

export async function readRunState(paths: ArtifactPaths): Promise<RunState | null> {
  try {
    const raw = await readFile(paths.runState, 'utf8')
    return JSON.parse(raw) as RunState
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export async function writeRunState(paths: ArtifactPaths, state: RunState): Promise<void> {
  await ensureArtifactDir(paths)
  await writeFile(paths.runState, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export function shouldSkipSentRun(state: RunState | null, force: boolean): boolean {
  return state?.status === 'sent' && !force
}

export async function writeArtifact(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
}

export async function createRunLock(paths: ArtifactPaths): Promise<{ release(): Promise<void> }> {
  await ensureArtifactDir(paths)

  let handle

  try {
    handle = await open(paths.lock, 'wx')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
      throw new Error(`Task for ${paths.dir} is already running.`)
    }

    throw error
  }

  await handle.writeFile(new Date().toISOString(), 'utf8')
  await handle.close()

  return {
    async release() {
      await rm(paths.lock, { force: true })
    },
  }
}
