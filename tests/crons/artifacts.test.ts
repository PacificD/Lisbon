import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createRunLock,
  getArtifactPaths,
  readRunState,
  shouldSkipSentRun,
  writeRunState,
} from '../../apps/crons/src/artifacts.ts'

let tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
  tempDirs = []
})

async function makeRoot() {
  const dir = await mkdtemp(join(tmpdir(), 'lisbon-crons-'))
  tempDirs.push(dir)
  return dir
}

describe('cron artifacts', () => {
  it('stores and reads run state by task and date', async () => {
    const root = await makeRoot()
    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })

    await writeRunState(paths, {
      status: 'sent',
      taskName: 'daily-us-market-overview',
      date: '2026-05-24',
      startedAt: '2026-05-24T00:00:00.000Z',
      finishedAt: '2026-05-24T00:01:00.000Z',
      provider: 'resend',
      providerMessageId: 'email-id',
    })

    await expect(readRunState(paths)).resolves.toMatchObject({
      status: 'sent',
      providerMessageId: 'email-id',
    })
  })

  it('skips sent runs unless forced', async () => {
    expect(shouldSkipSentRun({ status: 'sent', taskName: 'task', date: '2026-05-24' }, false)).toBe(true)
    expect(shouldSkipSentRun({ status: 'sent', taskName: 'task', date: '2026-05-24' }, true)).toBe(false)
    expect(shouldSkipSentRun({ status: 'failed', taskName: 'task', date: '2026-05-24' }, false)).toBe(false)
  })

  it('prevents two concurrent locks for the same artifact directory', async () => {
    const root = await makeRoot()
    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })
    const firstLock = await createRunLock(paths)

    await expect(createRunLock(paths)).rejects.toThrow('already running')

    await firstLock.release()
    const secondLock = await createRunLock(paths)
    await secondLock.release()
  })
})
