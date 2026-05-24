# Controlled Cron Newsletter Renderer Design

## Goal

Add a controlled email renderer for cron-generated market newsletters that accepts structured JSON content and returns both HTML and plain text output.

## Scope

The renderer supports a fixed `CronNewsletterContent` shape with `subject`, `previewText`, `intro`, and ordered `sections`. Each section has a `heading` plus optional `paragraphs` and `bullets`. The implementation must not execute generated React code or accept arbitrary template source.

## Architecture

The cron newsletter has its own React Email template in `packages/email/src/templates/cron-newsletter.tsx`, separate from the existing workflow newsletter template. Plain text rendering lives in `packages/email/src/cron-text.ts` so HTML and text formatting stay independent and testable. `packages/email/src/render.ts` exports `renderCronNewsletterContent(content)` and the cron newsletter types while preserving existing newsletter exports.

## Data Flow

Callers pass trusted structured JSON to `renderCronNewsletterContent`. The function renders `CronNewsletterTemplate` through `@react-email/render` for HTML and calls `renderCronNewsletterText` for plain text. Section order and content order are preserved in both outputs.

## Testing

Use TDD. First add `tests/email/cron-newsletter-render.test.ts` and run it to verify the missing export failure. Then implement the minimal template, text renderer, and render export until the new focused test passes. Finally rerun the existing newsletter renderer test to confirm the current rendering API still works.

## Out of Scope

No LLM-generated React execution, schema validation, sending behavior, cron scheduling, persistence, or changes to the existing newsletter renderer contract.
