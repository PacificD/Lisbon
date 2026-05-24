# Crons Config Schemas Design Spec

Date: 2026-05-24
Status: Approved for implementation

## Overview

Add the first `apps/crons` workspace app skeleton for cron configuration and newsletter JSON validation. This task only creates static app metadata, prompt files, schema modules, and focused tests.

## Scope

- Create `@lisbon/crons` under `apps/crons`.
- Store the initial business schedule and recipients in `apps/crons/config.json`.
- Store the first Codex prompt and Markdown-to-newsletter JSON transform prompt in prompt files.
- Validate cron config with zod, including timezone, recipient emails, task names, `hhmm`, and prompt paths.
- Validate second-pass newsletter JSON with zod.
- Parse Codex output as strict JSON only, rejecting prose or Markdown around the JSON.

## Non-Goals

- No artifact management.
- No Codex executor.
- No task orchestration.
- No CLI entrypoint implementation.
- No email sending behavior.

## Design

`apps/crons/src/config.ts` exports zod schemas, inferred types, config/env loaders, and `resolveTaskConfig`. Environment validation requires `RESEND_API_KEY` and `MAIL_FROM`, while defaulting `CODEX_BIN` to `codex` and `CRONS_ARTIFACTS_DIR` to `apps/crons/artifacts`.

`apps/crons/src/newsletter-json.ts` exports zod schemas for the controlled newsletter payload. A section must include a non-empty heading and at least one non-empty paragraph or bullet. `parseNewsletterJson` trims and parses the whole output with `JSON.parse`, so prose outside JSON is rejected before schema validation.

## Testing

Use Vitest tests under `tests/crons`. Follow TDD: add the config and newsletter JSON tests first, verify they fail because the cron app modules do not exist, then add the minimal implementation and rerun the targeted tests.
