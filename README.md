# Lisbon

Local-first themed newsletter tooling for operators. The current implementation provides:

- shared core services for themes, subscribers, drafts, and sending
- workflow-based draft generation
- React Email rendering
- Resend delivery adapter
- local CLI shell
- local Hono server shell

## Local setup

1. Copy `.env.example` to `.env`
2. Fill in your Supabase and Resend credentials
3. Install dependencies with `pnpm install`
4. Apply `packages/db/src/sql/001_initial_schema.sql` to your Supabase project

## Useful commands

- `pnpm test`
- `pnpm typecheck`
- `pnpm --filter @lisbon/cli dev`
- `pnpm --filter @lisbon/server dev`

## Environment

Required variables are listed in `.env.example`.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `PREVIEW_OUTPUT_DIR`
- `DEFAULT_ISSUE_DATE_TIMEZONE`

## Notes

- The CLI is the primary operator entrypoint.
- The server currently exposes a local shell with `/health` and placeholder route surfaces.
- Draft previews are written to `PREVIEW_OUTPUT_DIR` when requested from the CLI.
