# Renderer Contract Alignment Design

Date: 2026-05-02
Status: Approved for implementation

## Overview

Task 4 exposed a real runtime mismatch between the core `DraftRenderer` port and `@react-email/render`.

`@react-email/render` returns a promise for HTML output, but the current core port still models rendering as synchronous `render(...) => string`. At the same time, Task 4 adapters and tests have already started using `renderHtml(...)` and `renderText(...)`.

This fix aligns the core contract to the real runtime with the smallest coherent change across `packages/core`, `packages/email`, `packages/integrations-resend`, and the affected tests.

## Goals

- Make HTML draft rendering async at the core port boundary.
- Add explicit text rendering support for send-time plain text output.
- Keep the email rendering adapter compatible with existing Task 4 usage.
- Make sender results include provider identity plus provider message id.
- Preserve current product behavior for draft generation, approval, and sending.

## Non-Goals

- Changing newsletter draft persistence shape.
- Introducing stored rendered text in drafts.
- Adding a second email provider.
- Refactoring unrelated workflow, CLI, or server code.

## Contract Changes

### DraftRenderer

The core port will expose:

- `renderHtml({ theme, result }): Promise<string>`
- `renderText({ theme, result }): string`

For compatibility with code that still calls `render(...)`, the port may keep:

- `render({ theme, result }): Promise<string>`

`render(...)` is treated as an alias for `renderHtml(...)`, not a separate rendering mode.

### EmailSender

The core port will expose:

- `send({ from, to, subject, html, text? }): Promise<{ provider: 'resend'; providerMessageId: string }>`

This matches current Resend adapter behavior and lets core services stop hardcoding the provider name when marking a draft as sent.

## Service Behavior

### Draft Generation

`DraftService.generate` will await HTML rendering through the async renderer contract before persisting the draft.

### Draft Approval

`SendService.approve` will regenerate HTML through the async renderer contract before marking a draft approved. This preserves the existing behavior where approval refreshes the rendered HTML from the stored payload.

### Send

`SendService.send` will keep using the persisted `renderedHtml` for HTML delivery. It will generate text at send time from the draft payload and theme, pass both HTML and text to the sender, and store the provider name returned by the sender result.

## Testing

The focused regression coverage for this fix is:

- core service tests updated for async renderer methods and sender result shape
- email rendering tests asserting async HTML and text helpers
- workflow tests unchanged unless type fallout requires adjustment

## Risks And Constraints

- Keeping `render(...)` as a compatibility alias avoids broader breakage while still moving the architecture to the explicit `renderHtml` and `renderText` model.
- `sendProvider` is currently constrained to `'resend' | null` in the draft domain, which is acceptable for this scope because Resend is still the only supported provider in the approved design.
