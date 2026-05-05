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

## Supabase schema bootstrap

Open Supabase Dashboard -> SQL Editor and run this SQL:

```sql
create extension if not exists pgcrypto;

create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  workflow_name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists theme_subscribers (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references themes(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (theme_id, email)
);

create table if not exists newsletter_drafts (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references themes(id) on delete cascade,
  issue_date date not null,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'approved', 'sent', 'failed')),
  subject text not null,
  preview_text text not null,
  draft_payload_json jsonb not null,
  rendered_html text not null,
  approved_at timestamptz,
  sent_at timestamptz,
  send_provider text,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (theme_id, issue_date, version)
);

create unique index if not exists newsletter_drafts_one_sent_per_issue on newsletter_drafts (theme_id, issue_date) where status = 'sent';
```

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
