# Crons Config Schemas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `apps/crons` workspace skeleton with config validation, newsletter JSON validation, prompt files, and tests.

**Architecture:** Keep Task 2 limited to schemas and static configuration. `config.ts` owns cron config/env validation and lookup helpers; `newsletter-json.ts` owns strict model-output parsing and controlled newsletter payload validation.

**Tech Stack:** TypeScript, pnpm workspaces, zod, Vitest.

---

## File Structure

- Create `apps/crons/package.json` for the workspace package metadata and scripts.
- Create `apps/crons/tsconfig.json` for the app TypeScript project.
- Create `apps/crons/config.json` for the initial daily market overview task config.
- Create `apps/crons/prompts/daily-us-market-overview.md` for the source prompt.
- Create `apps/crons/prompts/market-md-to-newsletter-json.md` for the transform prompt.
- Create `apps/crons/src/config.ts` for cron config/env schemas and loaders.
- Create `apps/crons/src/newsletter-json.ts` for newsletter JSON schemas and parser.
- Create `tests/crons/config.test.ts` for config validation tests.
- Create `tests/crons/newsletter-json.test.ts` for newsletter JSON validation tests.

## Task 1: Add Failing Tests

- [ ] Create `tests/crons/config.test.ts` with tests for valid config, malformed `hhmm`, and env defaults.
- [ ] Create `tests/crons/newsletter-json.test.ts` with tests for valid sections, empty sections, strict JSON parsing, and prose rejection.
- [ ] Run `pnpm test tests/crons/config.test.ts tests/crons/newsletter-json.test.ts`.
- [ ] Confirm the command fails because `apps/crons/src/config.ts` and `apps/crons/src/newsletter-json.ts` do not exist.

## Task 2: Add Cron App Skeleton and Schemas

- [ ] Create `apps/crons/package.json` exactly as specified for `@lisbon/crons`.
- [ ] Create `apps/crons/tsconfig.json`.
- [ ] Create `apps/crons/config.json`.
- [ ] Create both prompt files.
- [ ] Create `apps/crons/src/config.ts` with zod config/env schemas, loaders, and `resolveTaskConfig`.
- [ ] Create `apps/crons/src/newsletter-json.ts` with zod newsletter schemas and `parseNewsletterJson`.
- [ ] Run `pnpm test tests/crons/config.test.ts tests/crons/newsletter-json.test.ts` and confirm the tests pass.

## Task 3: Lockfile and Commit

- [ ] Run `pnpm install --lockfile-only`.
- [ ] Verify `pnpm-lock.yaml` includes the new `apps/crons` importer and `zod`.
- [ ] Check `git status --short`.
- [ ] Stage only Task 2 files and `pnpm-lock.yaml`.
- [ ] Commit with `git commit -m "feat: add cron config schemas"`.
