# Send Provider Pass-Through Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the hardcoded send provider from core draft state and pass provider identity through from `EmailSender.send(...)`.

**Architecture:** Keep the change at the state/service seam: update `markDraftSent` to accept provider explicitly, then have `send-service` pass through the sender result without post-processing.

**Tech Stack:** TypeScript, Vitest, pnpm

---

### Task 1: Align The Core Send State Helper

**Files:**
- Modify: `packages/core/src/lib/draft-state.ts`
- Modify: `packages/core/src/services/send-service.ts`
- Test: `tests/core/draft-services.test.ts`

- [ ] **Step 1: Change the helper input shape**

```ts
export function markDraftSent(
  draft: NewsletterDraft,
  input: { now: string; provider: 'resend'; providerMessageId: string },
): NewsletterDraft
```

- [ ] **Step 2: Use the passed provider in the returned draft**

```ts
return {
  ...draft,
  status: 'sent',
  sentAt: input.now,
  sendProvider: input.provider,
  providerMessageId: input.providerMessageId,
  errorMessage: null,
  updatedAt: input.now,
}
```

- [ ] **Step 3: Remove the service-level override**

```ts
return draftRepository.update(
  markDraftSent(selectedDraft, {
    now,
    provider: sendResult.provider,
    providerMessageId: sendResult.providerMessageId,
  }),
)
```

- [ ] **Step 4: Run focused tests**

Run: `pnpm test -- --run tests/core/draft-services.test.ts`
Expected: PASS

### Task 2: Full Verification And Commit

**Files:**
- Commit: current worktree changes only

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 2: Run the full typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Self-review**

Checklist:

```text
- markDraftSent no longer hardcodes provider.
- send-service passes through the provider from EmailSender.send(...).
- tests still assert persisted provider identity.
```

- [ ] **Step 4: Commit the fix**

```bash
git add docs/superpowers/specs/2026-05-02-send-provider-pass-through-design.md \
  docs/superpowers/plans/2026-05-02-send-provider-pass-through.md \
  packages/core/src/lib/draft-state.ts \
  packages/core/src/services/send-service.ts
git commit -m "fix: pass send provider through core state"
```
