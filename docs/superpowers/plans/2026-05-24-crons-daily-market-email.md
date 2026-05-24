# Crons Daily Market Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a systemd-triggered `apps/crons` task that generates a daily US market overview with two `codex exec` passes, validates JSON, renders a React Email newsletter, and sends it through Resend.

**Architecture:** `apps/crons` is a one-shot pnpm workspace app with focused modules for config loading, artifact state, Codex execution, and the daily task. `packages/email` gets a separate controlled JSON newsletter renderer so LLM output is data, not executable React component code. Ubuntu systemd owns scheduling; app code owns task execution, idempotency, artifacts, rendering, and sending.

**Tech Stack:** TypeScript, pnpm workspaces, tsx, zod, React Email, Resend integration, Vitest, Node `child_process`, Node `fs/promises`, systemd docs.

---

## File Structure

- Create `apps/crons/package.json` for the new workspace app and scripts.
- Create `apps/crons/tsconfig.json` for TypeScript settings consistent with existing apps.
- Create `apps/crons/config.json` for timezone, recipients, and task schedule.
- Create `apps/crons/prompts/daily-us-market-overview.md` for the first Codex prompt.
- Create `apps/crons/prompts/market-md-to-newsletter-json.md` for the second Codex prompt.
- Create `apps/crons/src/index.ts` for the CLI entrypoint.
- Create `apps/crons/src/config.ts` for zod config and environment validation.
- Create `apps/crons/src/newsletter-json.ts` for zod validation of second-pass output.
- Create `apps/crons/src/artifacts.ts` for artifact paths, run state, and lock behavior.
- Create `apps/crons/src/codex.ts` for injectable `codex exec` execution.
- Create `apps/crons/src/tasks/daily-us-market-overview.ts` for task orchestration.
- Create `docs/ops/lisbon-crons-systemd.md` for systemd service/timer setup.
- Modify `packages/email/src/render.ts` to export the cron newsletter renderer.
- Create `packages/email/src/templates/cron-newsletter.tsx` for controlled JSON email HTML.
- Create `packages/email/src/cron-text.ts` for controlled JSON plain text.
- Leave `packages/email/package.json` unchanged because the renderer uses existing React Email dependencies.
- Create `tests/email/cron-newsletter-render.test.ts`.
- Create `tests/crons/config.test.ts`.
- Create `tests/crons/newsletter-json.test.ts`.
- Create `tests/crons/artifacts.test.ts`.
- Create `tests/crons/daily-market-task.test.ts`.

## Task 1: Add Controlled Cron Newsletter Renderer

**Files:**
- Create: `packages/email/src/templates/cron-newsletter.tsx`
- Create: `packages/email/src/cron-text.ts`
- Modify: `packages/email/src/render.ts`
- Test: `tests/email/cron-newsletter-render.test.ts`

- [ ] **Step 1: Write the failing renderer test**

Create `tests/email/cron-newsletter-render.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { renderCronNewsletterContent } from '../../packages/email/src/render.ts'

describe('cron newsletter email rendering', () => {
  it('renders controlled newsletter JSON as HTML and text', async () => {
    const rendered = await renderCronNewsletterContent({
      subject: '昨日美股收盘概览',
      previewText: '三大指数收跌，科技股承压。',
      intro: '以下为昨日美股收盘后的重点摘要。',
      sections: [
        {
          heading: '市场概览',
          paragraphs: ['标普 500 指数小幅回落，投资者继续评估利率路径。'],
          bullets: ['纳指弱于道指', '防御板块相对抗跌'],
        },
        {
          heading: '重点观察',
          paragraphs: ['大型科技股波动仍是盘面主线。'],
        },
      ],
    })

    expect(rendered.html.startsWith('<!DOCTYPE html')).toBe(true)
    expect(rendered.html).toContain('昨日美股收盘概览')
    expect(rendered.html).toContain('市场概览')
    expect(rendered.html).toContain('标普 500 指数小幅回落')
    expect(rendered.html).toContain('纳指弱于道指')
    expect(rendered.text).toContain('昨日美股收盘概览')
    expect(rendered.text).toContain('市场概览')
    expect(rendered.text).toContain('- 纳指弱于道指')
  })
})
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm test tests/email/cron-newsletter-render.test.ts
```

Expected: FAIL because `renderCronNewsletterContent` is not exported.

- [ ] **Step 3: Add the cron newsletter template**

Create `packages/email/src/templates/cron-newsletter.tsx`:

```tsx
import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export interface CronNewsletterSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface CronNewsletterContent {
  subject: string
  previewText: string
  intro: string
  sections: CronNewsletterSection[]
}

export function CronNewsletterTemplate({ content }: { content: CronNewsletterContent }) {
  return (
    <Html lang="zh-CN">
      <Head />
      <Preview>{content.previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={eyebrow}>Lisbon Market Brief</Text>
          <Heading as="h1" style={heading}>
            {content.subject}
          </Heading>
          <Text style={intro}>{content.intro}</Text>
          {content.sections.map((section, index) => (
            <Section key={`${section.heading}-${index}`} style={index === 0 ? sectionFirst : sectionBlock}>
              <Heading as="h2" style={sectionHeading}>
                {section.heading}
              </Heading>
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <Text key={`${section.heading}-p-${paragraphIndex}`} style={paragraphStyle}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.length ? (
                <ul style={bulletList}>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`${section.heading}-b-${bulletIndex}`} style={bulletItem}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {index < content.sections.length - 1 ? <Hr style={divider} /> : null}
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f6f7f9',
  fontFamily: 'Arial, "Helvetica Neue", sans-serif',
  margin: '0',
  padding: '32px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #d8dde6',
  margin: '0 auto',
  maxWidth: '680px',
  padding: '32px',
}

const eyebrow = {
  color: '#596579',
  fontSize: '12px',
  letterSpacing: '0.08em',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}

const heading = {
  color: '#111827',
  fontSize: '28px',
  lineHeight: '1.25',
  margin: '0 0 16px',
}

const intro = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.7',
  margin: '0 0 28px',
}

const sectionFirst = {
  marginTop: '0',
}

const sectionBlock = {
  marginTop: '24px',
}

const sectionHeading = {
  color: '#1f2937',
  fontSize: '20px',
  lineHeight: '1.35',
  margin: '0 0 12px',
}

const paragraphStyle = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 10px',
}

const bulletList = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '8px 0 0 20px',
  padding: '0',
}

const bulletItem = {
  margin: '0 0 6px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0 0',
}
```

- [ ] **Step 4: Add plain text rendering**

Create `packages/email/src/cron-text.ts`:

```ts
import type { CronNewsletterContent } from './templates/cron-newsletter.js'

export function renderCronNewsletterText(content: CronNewsletterContent): string {
  const lines = [
    content.subject,
    content.previewText,
    '',
    content.intro,
    '',
    ...content.sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []).map((bullet) => `- ${bullet}`),
      '',
    ]),
  ]

  return lines.filter((line, index, allLines) => line !== '' || allLines[index - 1] !== '').join('\n').trim()
}
```

- [ ] **Step 5: Export the renderer from the email package**

Modify `packages/email/src/render.ts`:

```ts
import { createElement } from 'react'
import { render } from '@react-email/render'

import type { DraftRenderer, Theme } from '@lisbon/core'
import type { WorkflowResult } from '@lisbon/shared'

import { renderCronNewsletterText } from './cron-text.js'
import { NewsletterTemplate } from './templates/newsletter.js'
import { CronNewsletterTemplate } from './templates/cron-newsletter.js'
import type { CronNewsletterContent } from './templates/cron-newsletter.js'
import { renderNewsletterText } from './text.js'

async function renderEmailTemplate(input: { theme: Theme; result: WorkflowResult }): Promise<string> {
  return render(createElement(NewsletterTemplate, input))
}

export function renderNewsletterHtml(input: { theme: Theme; result: WorkflowResult }): Promise<string> {
  return renderEmailTemplate(input)
}

export function renderNewsletterTextContent(input: { theme: Theme; result: WorkflowResult }): string {
  return renderNewsletterText(input)
}

export const draftRenderer: DraftRenderer = {
  render(input) {
    return renderNewsletterHtml(input)
  },
  renderHtml(input) {
    return renderNewsletterHtml(input)
  },
  renderText(input) {
    return renderNewsletterTextContent(input)
  },
}

export async function renderNewsletterContent(input: { theme: Theme; result: WorkflowResult }) {
  return {
    html: await draftRenderer.renderHtml(input),
    text: draftRenderer.renderText(input),
  }
}

export async function renderCronNewsletterContent(content: CronNewsletterContent) {
  return {
    html: await render(createElement(CronNewsletterTemplate, { content })),
    text: renderCronNewsletterText(content),
  }
}

export type { CronNewsletterContent, CronNewsletterSection } from './templates/cron-newsletter.js'
```

- [ ] **Step 6: Run the renderer test**

Run:

```bash
pnpm test tests/email/cron-newsletter-render.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run existing email test**

Run:

```bash
pnpm test tests/email/newsletter-render.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/email/src/render.ts packages/email/src/templates/cron-newsletter.tsx packages/email/src/cron-text.ts tests/email/cron-newsletter-render.test.ts
git commit -m "feat: add cron newsletter renderer"
```

## Task 2: Add Cron App Config and JSON Schemas

**Files:**
- Create: `apps/crons/package.json`
- Create: `apps/crons/tsconfig.json`
- Create: `apps/crons/config.json`
- Create: `apps/crons/prompts/daily-us-market-overview.md`
- Create: `apps/crons/prompts/market-md-to-newsletter-json.md`
- Create: `apps/crons/src/config.ts`
- Create: `apps/crons/src/newsletter-json.ts`
- Test: `tests/crons/config.test.ts`
- Test: `tests/crons/newsletter-json.test.ts`

- [ ] **Step 1: Write failing config tests**

Create `tests/crons/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { cronConfigSchema, cronEnvSchema, resolveTaskConfig } from '../../apps/crons/src/config.ts'

describe('cron config', () => {
  it('validates recipients, timezone, and task schedule', () => {
    const config = cronConfigSchema.parse({
      timezone: 'Asia/Shanghai',
      recipients: ['reader@example.com'],
      tasks: [
        {
          name: 'daily-us-market-overview',
          hhmm: '0800',
          enabled: true,
          prompt: 'prompts/daily-us-market-overview.md',
          transformPrompt: 'prompts/market-md-to-newsletter-json.md',
        },
      ],
    })

    expect(config.timezone).toBe('Asia/Shanghai')
    expect(config.recipients).toEqual(['reader@example.com'])
    expect(resolveTaskConfig(config, 'daily-us-market-overview')?.hhmm).toBe('0800')
  })

  it('rejects malformed hhmm values', () => {
    expect(() =>
      cronConfigSchema.parse({
        timezone: 'Asia/Shanghai',
        recipients: ['reader@example.com'],
        tasks: [
          {
            name: 'daily-us-market-overview',
            hhmm: '2460',
            enabled: true,
            prompt: 'prompts/a.md',
            transformPrompt: 'prompts/b.md',
          },
        ],
      }),
    ).toThrow()
  })

  it('loads env defaults without recipient configuration', () => {
    const env = cronEnvSchema.parse({
      RESEND_API_KEY: 'resend-key',
      MAIL_FROM: 'Lisbon <news@example.com>',
    })

    expect(env.CODEX_BIN).toBe('codex')
    expect(env.CRONS_ARTIFACTS_DIR).toBe('apps/crons/artifacts')
  })
})
```

- [ ] **Step 2: Write failing newsletter JSON tests**

Create `tests/crons/newsletter-json.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { parseNewsletterJson, newsletterJsonSchema } from '../../apps/crons/src/newsletter-json.ts'

describe('newsletter JSON validation', () => {
  it('accepts sections with paragraphs and bullets', () => {
    const content = newsletterJsonSchema.parse({
      subject: '昨日美股收盘概览',
      previewText: '三大指数收跌。',
      intro: '以下为重点摘要。',
      sections: [
        {
          heading: '市场概览',
          paragraphs: ['标普 500 指数回落。'],
          bullets: ['科技股承压'],
        },
      ],
    })

    expect(content.sections[0]?.heading).toBe('市场概览')
  })

  it('rejects sections without paragraphs or bullets', () => {
    expect(() =>
      newsletterJsonSchema.parse({
        subject: '昨日美股收盘概览',
        previewText: '三大指数收跌。',
        intro: '以下为重点摘要。',
        sections: [{ heading: '空章节' }],
      }),
    ).toThrow()
  })

  it('parses strict JSON output from Codex', () => {
    const content = parseNewsletterJson(
      JSON.stringify({
        subject: '昨日美股收盘概览',
        previewText: '三大指数收跌。',
        intro: '以下为重点摘要。',
        sections: [{ heading: '市场概览', paragraphs: ['标普 500 指数回落。'] }],
      }),
    )

    expect(content.subject).toBe('昨日美股收盘概览')
  })

  it('rejects prose outside JSON', () => {
    expect(() => parseNewsletterJson('Here is JSON: {"subject":"x"}')).toThrow('Codex output was not valid JSON')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm test tests/crons/config.test.ts tests/crons/newsletter-json.test.ts
```

Expected: FAIL because `apps/crons` files do not exist.

- [ ] **Step 4: Add cron package files**

Create `apps/crons/package.json`:

```json
{
  "name": "@lisbon/crons",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "task": "tsx src/index.ts task",
    "typecheck": "pnpm exec tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@lisbon/email": "workspace:*",
    "@lisbon/integrations-resend": "workspace:*",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
}
```

Create `apps/crons/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

Create `apps/crons/config.json`:

```json
{
  "timezone": "Asia/Shanghai",
  "recipients": ["you@example.com"],
  "tasks": [
    {
      "name": "daily-us-market-overview",
      "hhmm": "0800",
      "enabled": true,
      "prompt": "prompts/daily-us-market-overview.md",
      "transformPrompt": "prompts/market-md-to-newsletter-json.md"
    }
  ]
}
```

- [ ] **Step 5: Add prompt files**

Create `apps/crons/prompts/daily-us-market-overview.md`:

```md
获取一下昨日美股收盘概览
```

Create `apps/crons/prompts/market-md-to-newsletter-json.md`:

```md
将输入的 Markdown 市场概览转换成严格 JSON，用于 React Email 邮件模板渲染。

只输出 JSON。不要输出 Markdown 代码块。不要输出解释性文字。

JSON 必须匹配以下结构：

{
  "subject": "昨日美股收盘概览",
  "previewText": "美股主要指数、板块与重点公司表现摘要。",
  "intro": "简短导语",
  "sections": [
    {
      "heading": "市场概览",
      "paragraphs": ["一段正文"],
      "bullets": ["一个要点"]
    }
  ]
}

规则：
- subject、previewText、intro 必须是非空字符串。
- sections 至少包含一个 section。
- 每个 section 必须有非空 heading。
- 每个 section 必须至少包含一个 paragraph 或 bullet。
- paragraphs 和 bullets 中的每个字符串都必须非空。
- 内容适合邮件阅读，保持简洁。
- 如果原始 Markdown 对某些数据来源或结论存在不确定性，要在内容中明确说明，不要隐藏。
```

- [ ] **Step 6: Add config schema**

Create `apps/crons/src/config.ts`:

```ts
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { z } from 'zod'

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export const cronTaskConfigSchema = z.object({
  name: z.string().min(1),
  hhmm: z.string().regex(/^([01]\d|2[0-3])[0-5]\d$/, 'Expected hhmm in 0000-2359 format'),
  enabled: z.boolean(),
  prompt: z.string().min(1),
  transformPrompt: z.string().min(1),
})

export const cronConfigSchema = z.object({
  timezone: z.string().min(1).refine(isValidTimeZone, 'Expected a valid time zone'),
  recipients: z.array(z.string().email()).min(1),
  tasks: z.array(cronTaskConfigSchema).min(1),
})

export const cronEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  CODEX_BIN: z.string().min(1).default('codex'),
  CRONS_ARTIFACTS_DIR: z.string().min(1).default('apps/crons/artifacts'),
})

export type CronConfig = z.infer<typeof cronConfigSchema>
export type CronTaskConfig = z.infer<typeof cronTaskConfigSchema>
export type CronEnv = z.infer<typeof cronEnvSchema>

export async function loadCronConfig(path = 'apps/crons/config.json'): Promise<CronConfig> {
  const raw = await readFile(resolve(path), 'utf8')
  return cronConfigSchema.parse(JSON.parse(raw))
}

export function loadCronEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): CronEnv {
  return cronEnvSchema.parse(env)
}

export function resolveTaskConfig(config: CronConfig, taskName: string): CronTaskConfig | undefined {
  return config.tasks.find((task) => task.name === taskName)
}
```

- [ ] **Step 7: Add newsletter JSON schema**

Create `apps/crons/src/newsletter-json.ts`:

```ts
import { z } from 'zod'

const nonEmptyStringArraySchema = z.array(z.string().trim().min(1)).optional()

export const newsletterSectionSchema = z
  .object({
    heading: z.string().trim().min(1),
    paragraphs: nonEmptyStringArraySchema,
    bullets: nonEmptyStringArraySchema,
  })
  .refine((section) => Boolean(section.paragraphs?.length || section.bullets?.length), {
    message: 'Each section must include at least one paragraph or bullet',
  })

export const newsletterJsonSchema = z.object({
  subject: z.string().trim().min(1),
  previewText: z.string().trim().min(1),
  intro: z.string().trim().min(1),
  sections: z.array(newsletterSectionSchema).min(1),
})

export type NewsletterJson = z.infer<typeof newsletterJsonSchema>

export function parseNewsletterJson(output: string): NewsletterJson {
  let parsed: unknown

  try {
    parsed = JSON.parse(output.trim())
  } catch (error) {
    throw new Error(`Codex output was not valid JSON: ${error instanceof Error ? error.message : 'Unknown parse error'}`)
  }

  return newsletterJsonSchema.parse(parsed)
}
```

- [ ] **Step 8: Run config and schema tests**

Run:

```bash
pnpm test tests/crons/config.test.ts tests/crons/newsletter-json.test.ts
```

Expected: PASS.

- [ ] **Step 9: Update lockfile for the new cron workspace dependency**

Run:

```bash
pnpm install --lockfile-only
```

Expected: `pnpm-lock.yaml` includes the new `apps/crons` importer and its `zod` dependency. If the command requires network access in the sandbox, rerun it with escalation according to environment policy.

- [ ] **Step 10: Commit**

```bash
git add apps/crons/package.json apps/crons/tsconfig.json apps/crons/config.json apps/crons/prompts/daily-us-market-overview.md apps/crons/prompts/market-md-to-newsletter-json.md apps/crons/src/config.ts apps/crons/src/newsletter-json.ts tests/crons/config.test.ts tests/crons/newsletter-json.test.ts pnpm-lock.yaml
git commit -m "feat: add cron config schemas"
```

## Task 3: Add Artifact State and Idempotency

**Files:**
- Create: `apps/crons/src/artifacts.ts`
- Test: `tests/crons/artifacts.test.ts`

- [ ] **Step 1: Write failing artifact tests**

Create `tests/crons/artifacts.test.ts`:

```ts
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

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
```

- [ ] **Step 2: Run the failing artifact test**

Run:

```bash
pnpm test tests/crons/artifacts.test.ts
```

Expected: FAIL because `apps/crons/src/artifacts.ts` does not exist.

- [ ] **Step 3: Implement artifact state and lock helpers**

Create `apps/crons/src/artifacts.ts`:

```ts
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
```

- [ ] **Step 4: Run artifact tests**

Run:

```bash
pnpm test tests/crons/artifacts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/crons/src/artifacts.ts tests/crons/artifacts.test.ts
git commit -m "feat: add cron artifact state"
```

## Task 4: Add Codex Executor

**Files:**
- Create: `apps/crons/src/codex.ts`
- Test: the fake executor coverage is added in `tests/crons/daily-market-task.test.ts` during Task 5; no standalone child process test is required.

- [ ] **Step 1: Add Codex executor module**

Create `apps/crons/src/codex.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck the crons package**

Run:

```bash
pnpm --filter @lisbon/crons typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/crons/src/codex.ts
git commit -m "feat: add codex executor"
```

## Task 5: Implement Daily Market Task Orchestration

**Files:**
- Create: `apps/crons/src/tasks/daily-us-market-overview.ts`
- Modify: `apps/crons/src/index.ts`
- Test: `tests/crons/daily-market-task.test.ts`

- [ ] **Step 1: Write failing task tests**

Create `tests/crons/daily-market-task.test.ts`:

```ts
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getArtifactPaths, writeRunState } from '../../apps/crons/src/artifacts.ts'
import { runDailyUsMarketOverviewTask } from '../../apps/crons/src/tasks/daily-us-market-overview.ts'
import type { CodexExecutor } from '../../apps/crons/src/codex.ts'
import type { CronConfig, CronEnv } from '../../apps/crons/src/config.ts'

let tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
  tempDirs = []
})

async function makeRoot() {
  const dir = await mkdtemp(join(tmpdir(), 'lisbon-crons-task-'))
  tempDirs.push(dir)
  return dir
}

function makeConfig(root: string): { config: CronConfig; env: CronEnv } {
  return {
    config: {
      timezone: 'Asia/Shanghai',
      recipients: ['reader@example.com'],
      tasks: [
        {
          name: 'daily-us-market-overview',
          hhmm: '0800',
          enabled: true,
          prompt: 'apps/crons/prompts/daily-us-market-overview.md',
          transformPrompt: 'apps/crons/prompts/market-md-to-newsletter-json.md',
        },
      ],
    },
    env: {
      RESEND_API_KEY: 'resend-key',
      MAIL_FROM: 'Lisbon <news@example.com>',
      CODEX_BIN: 'codex',
      CRONS_ARTIFACTS_DIR: root,
    },
  }
}

describe('daily US market overview task', () => {
  it('runs both Codex passes, renders artifacts, and sends email', async () => {
    const root = await makeRoot()
    const { config, env } = makeConfig(root)
    const codex: CodexExecutor = {
      exec: vi
        .fn()
        .mockResolvedValueOnce('# 昨日美股收盘概览\n\n三大指数收跌。')
        .mockResolvedValueOnce(
          JSON.stringify({
            subject: '昨日美股收盘概览',
            previewText: '三大指数收跌。',
            intro: '以下为重点摘要。',
            sections: [{ heading: '市场概览', paragraphs: ['三大指数收跌。'], bullets: ['科技股承压'] }],
          }),
        ),
    }
    const send = vi.fn().mockResolvedValue({ provider: 'resend' as const, providerMessageId: 'email-id' })

    const result = await runDailyUsMarketOverviewTask({
      config,
      env,
      codex,
      emailSender: { send },
      now: new Date('2026-05-24T00:05:00.000Z'),
      force: false,
    })

    expect(result.status).toBe('sent')
    expect(codex.exec).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Lisbon <news@example.com>',
      to: ['reader@example.com'],
      subject: '昨日美股收盘概览',
    }))

    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })
    await expect(readFile(paths.sourceMarkdown, 'utf8')).resolves.toContain('三大指数收跌')
    await expect(readFile(paths.newsletterJson, 'utf8')).resolves.toContain('市场概览')
    await expect(readFile(paths.emailHtml, 'utf8')).resolves.toContain('昨日美股收盘概览')
    await expect(readFile(paths.emailText, 'utf8')).resolves.toContain('- 科技股承压')
    await expect(readFile(paths.runState, 'utf8')).resolves.toContain('email-id')
  })

  it('skips an already sent run without force', async () => {
    const root = await makeRoot()
    const { config, env } = makeConfig(root)
    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })
    await writeRunState(paths, {
      status: 'sent',
      taskName: 'daily-us-market-overview',
      date: '2026-05-24',
      provider: 'resend',
      providerMessageId: 'existing-id',
    })
    const codex: CodexExecutor = { exec: vi.fn() }
    const send = vi.fn()

    const result = await runDailyUsMarketOverviewTask({
      config,
      env,
      codex,
      emailSender: { send },
      now: new Date('2026-05-24T00:05:00.000Z'),
      force: false,
    })

    expect(result.status).toBe('skipped')
    expect(codex.exec).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('records invalid JSON failures and does not send', async () => {
    const root = await makeRoot()
    const { config, env } = makeConfig(root)
    const codex: CodexExecutor = {
      exec: vi.fn().mockResolvedValueOnce('# source').mockResolvedValueOnce('not json'),
    }
    const send = vi.fn()

    await expect(runDailyUsMarketOverviewTask({
      config,
      env,
      codex,
      emailSender: { send },
      now: new Date('2026-05-24T00:05:00.000Z'),
      force: false,
    })).rejects.toThrow('Codex output was not valid JSON')

    const paths = getArtifactPaths({ root, taskName: 'daily-us-market-overview', date: '2026-05-24' })
    await expect(readFile(paths.rawNewsletterOutput, 'utf8')).resolves.toBe('not json')
    await expect(readFile(paths.runState, 'utf8')).resolves.toContain('"status": "failed"')
    expect(send).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run failing task tests**

Run:

```bash
pnpm test tests/crons/daily-market-task.test.ts
```

Expected: FAIL because the daily task module does not exist.

- [ ] **Step 3: Implement the daily task**

Create `apps/crons/src/tasks/daily-us-market-overview.ts`:

```ts
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { EmailSender } from '@lisbon/core'
import { renderCronNewsletterContent } from '@lisbon/email'

import {
  createRunLock,
  getArtifactPaths,
  readRunState,
  shouldSkipSentRun,
  writeArtifact,
  writeRunState,
} from '../artifacts.js'
import { buildTransformInput } from '../codex.js'
import type { CodexExecutor } from '../codex.js'
import type { CronConfig, CronEnv } from '../config.js'
import { resolveTaskConfig } from '../config.js'
import { parseNewsletterJson } from '../newsletter-json.js'

export const DAILY_US_MARKET_TASK_NAME = 'daily-us-market-overview'

export interface DailyUsMarketOverviewInput {
  config: CronConfig
  env: CronEnv
  codex: CodexExecutor
  emailSender: EmailSender
  now?: Date
  force?: boolean
}

export async function runDailyUsMarketOverviewTask(input: DailyUsMarketOverviewInput) {
  const now = input.now ?? new Date()
  const force = input.force ?? false
  const date = formatDateInTimeZone(now, input.config.timezone)
  const task = resolveTaskConfig(input.config, DAILY_US_MARKET_TASK_NAME)

  if (!task) {
    throw new Error(`Task ${DAILY_US_MARKET_TASK_NAME} was not found in apps/crons/config.json.`)
  }

  if (!task.enabled) {
    throw new Error(`Task ${DAILY_US_MARKET_TASK_NAME} is disabled.`)
  }

  const paths = getArtifactPaths({
    root: input.env.CRONS_ARTIFACTS_DIR,
    taskName: DAILY_US_MARKET_TASK_NAME,
    date,
  })
  const existingState = await readRunState(paths)

  if (shouldSkipSentRun(existingState, force)) {
    const skippedState = {
      status: 'skipped' as const,
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt: now.toISOString(),
      finishedAt: now.toISOString(),
      provider: existingState?.provider,
      providerMessageId: existingState?.providerMessageId,
    }
    await writeRunState(paths, skippedState)
    return skippedState
  }

  const lock = await createRunLock(paths)
  const startedAt = now.toISOString()

  try {
    await writeRunState(paths, {
      status: 'running',
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt,
    })

    const sourcePrompt = await readFile(resolve(task.prompt), 'utf8')
    const sourceMarkdown = await input.codex.exec(sourcePrompt)
    await writeArtifact(paths.sourceMarkdown, sourceMarkdown)

    const transformPrompt = await readFile(resolve(task.transformPrompt), 'utf8')
    const rawNewsletterOutput = await input.codex.exec(transformPrompt, buildTransformInput(sourceMarkdown))
    await writeArtifact(paths.rawNewsletterOutput, rawNewsletterOutput)

    const newsletter = parseNewsletterJson(rawNewsletterOutput)
    await writeArtifact(paths.newsletterJson, `${JSON.stringify(newsletter, null, 2)}\n`)

    const rendered = await renderCronNewsletterContent(newsletter)
    await writeArtifact(paths.emailHtml, rendered.html)
    await writeArtifact(paths.emailText, rendered.text)

    const sendResult = await input.emailSender.send({
      from: input.env.MAIL_FROM,
      to: input.config.recipients,
      subject: newsletter.subject,
      html: rendered.html,
      text: rendered.text,
    })

    const sentState = {
      status: 'sent' as const,
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt,
      finishedAt: new Date().toISOString(),
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
    }
    await writeRunState(paths, sentState)
    return sentState
  } catch (error) {
    const failedState = {
      status: 'failed' as const,
      taskName: DAILY_US_MARKET_TASK_NAME,
      date,
      startedAt,
      finishedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown task failure',
    }
    await writeRunState(paths, failedState)
    throw error
  } finally {
    await lock.release()
  }
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error(`Could not format run date for ${timeZone}.`)
  }

  return `${year}-${month}-${day}`
}
```

- [ ] **Step 4: Run task tests**

Run:

```bash
pnpm test tests/crons/daily-market-task.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/crons/src/tasks/daily-us-market-overview.ts tests/crons/daily-market-task.test.ts
git commit -m "feat: add daily market cron task"
```

## Task 6: Add CLI Entrypoint and Systemd Documentation

**Files:**
- Create: `apps/crons/src/index.ts`
- Create: `docs/ops/lisbon-crons-systemd.md`
- Modify: `.env.example`
- Test: `tests/crons/daily-market-task.test.ts` remains the task behavior test; use typecheck and smoke command for CLI wiring.

- [ ] **Step 1: Add CLI entrypoint**

Create `apps/crons/src/index.ts`:

```ts
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
```

- [ ] **Step 2: Extend `.env.example`**

Modify `.env.example` to append:

```env
# Crons
CODEX_BIN=codex
CRONS_ARTIFACTS_DIR=apps/crons/artifacts
```

Keep existing variables intact.

- [ ] **Step 3: Add systemd docs**

Create `docs/ops/lisbon-crons-systemd.md`:

```md
# Lisbon Crons systemd Setup

This setup runs the daily market overview task through Ubuntu systemd.

## Required Environment

Create an environment file readable by the service user, for example `/home/dev/Lisbon/.env.crons`:

```env
RESEND_API_KEY=your_resend_key
MAIL_FROM=Lisbon <news@example.com>
CODEX_BIN=/absolute/path/to/codex
CRONS_ARTIFACTS_DIR=apps/crons/artifacts
```

Recipients are configured in `apps/crons/config.json`, not in the environment file.

## Service

Create `/etc/systemd/system/lisbon-daily-us-market.service`:

```ini
[Unit]
Description=Lisbon daily US market overview email

[Service]
Type=oneshot
WorkingDirectory=/home/dev/Lisbon
EnvironmentFile=/home/dev/Lisbon/.env.crons
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/pnpm --filter @lisbon/crons task daily-us-market-overview
```

Adjust `ExecStart`, `PATH`, and `CODEX_BIN` to match the host.

## Timer

If the host timezone is Asia/Shanghai, create `/etc/systemd/system/lisbon-daily-us-market.timer`:

```ini
[Unit]
Description=Run Lisbon daily US market overview at 08:00 Asia/Shanghai

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true
Unit=lisbon-daily-us-market.service

[Install]
WantedBy=timers.target
```

If the host timezone is UTC, use:

```ini
OnCalendar=*-*-* 00:00:00 UTC
```

## Commands

Reload units:

```bash
sudo systemctl daemon-reload
```

Run once manually:

```bash
sudo systemctl start lisbon-daily-us-market.service
```

Enable timer:

```bash
sudo systemctl enable --now lisbon-daily-us-market.timer
```

Inspect status:

```bash
systemctl status lisbon-daily-us-market.service
systemctl list-timers lisbon-daily-us-market.timer
journalctl -u lisbon-daily-us-market.service -n 100 --no-pager
```
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm --filter @lisbon/crons typecheck
```

Expected: PASS.

- [ ] **Step 5: Run all cron and email tests**

Run:

```bash
pnpm test tests/crons/config.test.ts tests/crons/newsletter-json.test.ts tests/crons/artifacts.test.ts tests/crons/daily-market-task.test.ts tests/email/cron-newsletter-render.test.ts tests/email/newsletter-render.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run workspace checks**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/crons/src/index.ts docs/ops/lisbon-crons-systemd.md .env.example
git commit -m "docs: add crons systemd setup"
```

## Final Verification

- [ ] **Step 1: Confirm no generated artifacts are tracked**

Run:

```bash
git status --short
```

Expected: no untracked `apps/crons/artifacts` files. If artifacts exist from manual testing, leave them untracked and add an ignore rule only if the repo does not already ignore generated local output.

- [ ] **Step 2: Run final checks**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Summarize implementation**

Report:

- created `apps/crons`
- added controlled cron newsletter renderer
- added zod validation
- added artifact idempotency
- added systemd setup docs
- tests run and their results

## Self-Review Notes

- Spec coverage: Tasks cover `apps/crons`, config, prompts, two Codex passes, JSON validation, React Email rendering, Resend sending, artifact status, idempotency, systemd documentation, and tests.
- Scope: This stays within the approved first approach. It does not add a resident scheduler, generated React components, DB persistence, or manual approval.
- Type consistency: `NewsletterJson` shape matches `CronNewsletterContent`; task config names match `config.json`; task name is consistently `daily-us-market-overview`.
