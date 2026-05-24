# Controlled Cron Newsletter Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controlled JSON-to-email renderer for cron market newsletters.

**Architecture:** Create a dedicated React Email template for cron newsletter HTML and a separate plain text renderer. Export a new `renderCronNewsletterContent` function from the existing email render module without changing the existing newsletter renderer.

**Tech Stack:** TypeScript, React Email, Vitest, pnpm.

---

### Task 1: Add Controlled Cron Newsletter Renderer

**Files:**
- Create: `tests/email/cron-newsletter-render.test.ts`
- Create: `packages/email/src/templates/cron-newsletter.tsx`
- Create: `packages/email/src/cron-text.ts`
- Modify: `packages/email/src/render.ts`

- [ ] **Step 1: Write the failing renderer test**

Create `tests/email/cron-newsletter-render.test.ts` with a Vitest test that imports `renderCronNewsletterContent`, renders Chinese cron newsletter JSON, and asserts expected HTML and plain text content.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test tests/email/cron-newsletter-render.test.ts`

Expected: FAIL because `renderCronNewsletterContent` is not exported yet.

- [ ] **Step 3: Add the cron newsletter template**

Create `packages/email/src/templates/cron-newsletter.tsx` with `CronNewsletterSection`, `CronNewsletterContent`, and `CronNewsletterTemplate`. The template renders preview text, subject, intro, sections, paragraphs, bullets, and dividers with React Email components.

- [ ] **Step 4: Add plain text rendering**

Create `packages/email/src/cron-text.ts` with `renderCronNewsletterText(content)`, returning subject, preview, intro, section headings, paragraphs, and `- ` prefixed bullet lines.

- [ ] **Step 5: Export the renderer from the email package**

Modify `packages/email/src/render.ts` to import the cron template and text renderer, export `CronNewsletterContent` and `CronNewsletterSection` types, and add `renderCronNewsletterContent(content)` returning `{ html, text }`.

- [ ] **Step 6: Run the renderer test**

Run: `pnpm test tests/email/cron-newsletter-render.test.ts`

Expected: PASS.

- [ ] **Step 7: Run the existing email test**

Run: `pnpm test tests/email/newsletter-render.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-05-24-controlled-cron-newsletter-renderer-design.md docs/superpowers/plans/2026-05-24-controlled-cron-newsletter-renderer.md packages/email/src/render.ts packages/email/src/templates/cron-newsletter.tsx packages/email/src/cron-text.ts tests/email/cron-newsletter-render.test.ts
git commit -m "feat: add cron newsletter renderer"
```
