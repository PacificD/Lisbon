# Renderer Contract Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the core renderer and sender contracts with the real React Email and Resend runtime behavior without changing product behavior.

**Architecture:** Update the core runtime interfaces first, then make draft/send services consume the corrected contracts, then align the email and resend adapters plus affected tests. Keep the change narrow by preserving draft persistence shape and using `render` only as a compatibility alias for async HTML rendering.

**Tech Stack:** TypeScript, Vitest, pnpm, React Email, Resend

---

### Task 1: Update Core Runtime Contracts

**Files:**
- Modify: `packages/core/src/ports/runtime.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Define the corrected renderer and sender interfaces**

```ts
export interface DraftRenderer {
  render(input: { theme: Theme; result: WorkflowResult }): Promise<string>
  renderHtml(input: { theme: Theme; result: WorkflowResult }): Promise<string>
  renderText(input: { theme: Theme; result: WorkflowResult }): string
}

export interface EmailSender {
  send(message: {
    from: string
    to: string[]
    subject: string
    html: string
    text?: string
  }): Promise<{ provider: 'resend'; providerMessageId: string }>
}
```

- [ ] **Step 2: Re-export the updated types from core**

```ts
export type { DraftRenderer, EmailSender, WorkflowRegistry, WorkflowRunner } from './ports/runtime.js'
```

- [ ] **Step 3: Typecheck the core package usage through imports**

Run: `pnpm typecheck`
Expected: type errors move to service and adapter call sites that still assume the old contract

### Task 2: Update Draft And Send Services

**Files:**
- Modify: `packages/core/src/services/draft-service.ts`
- Modify: `packages/core/src/services/send-service.ts`

- [ ] **Step 1: Make draft generation await async HTML rendering**

```ts
const renderedHtml = await draftRenderer.renderHtml({ theme, result })
```

- [ ] **Step 2: Make approval regenerate HTML through the async renderer**

```ts
renderedHtml: await draftRenderer.renderHtml({
  theme,
  result: selectedDraft.draftPayload,
}),
```

- [ ] **Step 3: Generate plain text at send time and use returned provider metadata**

```ts
sendResult = await emailSender.send({
  from: mailFrom,
  to: subscribers.map((subscriber) => subscriber.email),
  subject: selectedDraft.subject,
  html: selectedDraft.renderedHtml,
  text: draftRenderer.renderText({
    theme,
    result: selectedDraft.draftPayload,
  }),
})

return draftRepository.update(
  markDraftSent(selectedDraft, {
    now,
    provider: sendResult.provider,
    providerMessageId: sendResult.providerMessageId,
  }),
)
```

- [ ] **Step 4: Update draft-state typing if service changes require provider input**

```ts
export function markDraftSent(
  draft: NewsletterDraft,
  input: { now: string; provider: 'resend'; providerMessageId: string },
): NewsletterDraft
```

- [ ] **Step 5: Run focused tests for core behavior**

Run: `pnpm test -- --run tests/core/draft-services.test.ts`
Expected: PASS with updated async renderer and sender assertions

### Task 3: Align Email Adapter, Resend Adapter, And Tests

**Files:**
- Modify: `packages/email/src/render.ts`
- Modify: `packages/integrations-resend/src/sender.ts`
- Modify: `tests/core/draft-services.test.ts`
- Modify: `tests/email/newsletter-render.test.ts`
- Modify: `tests/workflows/frontend-daily.test.ts` only if type fallout requires it

- [ ] **Step 1: Type the email renderer against the core port**

```ts
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
```

- [ ] **Step 2: Make the resend sender satisfy the updated sender result contract**

```ts
return {
  provider: 'resend',
  providerMessageId,
}
```

- [ ] **Step 3: Update test doubles to implement the explicit async renderer and provider-aware sender**

```ts
function createDraftRenderer(): DraftRenderer {
  return {
    render: ({ theme: currentTheme, result }) =>
      Promise.resolve(`<article data-theme="${currentTheme.slug}">${result.subject}</article>`),
    renderHtml: ({ theme: currentTheme, result }) =>
      Promise.resolve(`<article data-theme="${currentTheme.slug}">${result.subject}</article>`),
    renderText: ({ theme: currentTheme, result }) =>
      `${currentTheme.name}: ${result.subject}`,
  }
}
```

- [ ] **Step 4: Assert send-time text generation and provider result handling**

```ts
expect(sentMessage).toEqual({
  from: config.MAIL_FROM,
  to: ['reader@example.com'],
  subject: 'Tech Daily v1',
  html: '<article data-theme="tech">Tech Daily v1</article>',
  text: 'Tech: Tech Daily v1',
})
```

- [ ] **Step 5: Run focused rendering tests**

Run: `pnpm test -- --run tests/email/newsletter-render.test.ts`
Expected: PASS with async HTML renderer and text helper assertions

### Task 4: Full Verification And Commit

**Files:**
- Modify: `docs/superpowers/specs/2026-05-02-renderer-contract-alignment-design.md`
- Modify: `docs/superpowers/plans/2026-05-02-renderer-contract-alignment.md`
- Commit: current worktree changes only

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 2: Run the full typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Self-review for contract consistency**

Checklist:

```text
- DraftRenderer is async for HTML and explicit for text everywhere.
- No service still assumes sync HTML rendering.
- EmailSender results include provider and providerMessageId everywhere.
- Resend adapter, core services, and tests agree on the same shapes.
```

- [ ] **Step 4: Commit the integration fix**

```bash
git add docs/superpowers/specs/2026-05-02-renderer-contract-alignment-design.md \
  docs/superpowers/plans/2026-05-02-renderer-contract-alignment.md \
  packages/core/src/ports/runtime.ts \
  packages/core/src/services/draft-service.ts \
  packages/core/src/services/send-service.ts \
  packages/core/src/index.ts \
  packages/email/src/render.ts \
  packages/integrations-resend/src/sender.ts \
  tests/core/draft-services.test.ts \
  tests/email/newsletter-render.test.ts
git commit -m "fix: align core renderer contract with email runtime"
```
