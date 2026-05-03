# Send Provider Pass-Through Design

Date: 2026-05-02
Status: Approved for implementation

## Overview

The previous renderer contract alignment left one inconsistency in core state handling.

`EmailSender.send(...)` now returns provider identity with `providerMessageId`, but `packages/core/src/lib/draft-state.ts` still hardcodes `sendProvider: 'resend'` inside `markDraftSent`. `send-service` currently works around this by overriding `sendProvider` after calling the helper.

This fix removes that split responsibility and makes provider identity flow through the core state helper directly.

## Goals

- Pass `provider` through `markDraftSent`.
- Keep `send-service` thin and coherent with the `EmailSender` contract.
- Preserve current runtime behavior and tests.

## Non-Goals

- Expanding provider support beyond the current `'resend'` contract.
- Changing draft persistence fields.
- Refactoring unrelated draft-state helpers.

## Design

`markDraftSent` will accept:

- `now`
- `provider`
- `providerMessageId`

It will set `sendProvider` from `input.provider` instead of a hardcoded literal.

`createSendService.send` will pass `sendResult.provider` into `markDraftSent` and stop patching the returned draft object afterward.

## Testing

Existing core service tests already assert that sent drafts persist `sendProvider: 'resend'`. Those assertions remain valid. No new product behavior is introduced, so only minimal test adjustments should be needed if type signatures change.
