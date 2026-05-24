# Crons Daily Market Email Design Spec

Date: 2026-05-24
Status: Approved for planning

## 1. Overview

Add an Ubuntu systemd timer driven cron app under `apps/crons`.

The first task sends a fully automated daily market overview email. At the scheduled time, systemd invokes a one-shot task runner. The runner executes two `codex exec` passes, validates the second pass as structured JSON, renders a React Email newsletter, and sends it through the existing Resend integration.

The task runs without human confirmation. It stores intermediate and final artifacts locally so failures can be inspected and successful sends are not repeated accidentally.

## 2. Goals

- Create `apps/crons` as a pnpm workspace app for scheduled local automation.
- Keep task schedule and recipients in `apps/crons/config.json`.
- Keep prompt text in dedicated prompt files.
- Use `Asia/Shanghai` as the configured timezone.
- Use Ubuntu systemd timer as the scheduler.
- Execute the first task every day at 08:00 configured local business time.
- Generate the first draft with `codex exec` using the prompt: `获取一下昨日美股收盘概览`.
- Save the first pass result as Markdown.
- Execute a second `codex exec` pass that converts the Markdown into controlled newsletter JSON.
- Validate the generated JSON with zod before rendering or sending.
- Render the final email with the project-owned React Email template code.
- Send through `@lisbon/integrations-resend`.
- Save task artifacts and run status under `apps/crons/artifacts`.
- Prevent accidental duplicate sends for the same task and date unless explicitly forced.

## 3. Non-Goals

- No resident Node scheduler process.
- No dynamic import or execution of LLM-generated `.tsx`.
- No React Email CLI compilation step during normal task execution.
- No manual approval gate for the daily task.
- No database persistence for this first cron task.
- No reuse of the existing draft approval state machine in this iteration.
- No public web UI or operator dashboard.
- No automatic generation of installed systemd unit files in the first implementation.

## 4. Architecture

`apps/crons` is a one-shot command line app. Its primary command is:

```bash
pnpm --filter @lisbon/crons task daily-us-market-overview
```

The app is invoked by a systemd timer. systemd owns scheduling and process lifecycle. The cron app owns business logic, artifact management, validation, rendering, and sending.

Suggested layout:

```text
apps/crons/
  package.json
  config.json
  prompts/
    daily-us-market-overview.md
    market-md-to-newsletter-json.md
  artifacts/
    daily-us-market-overview/
      YYYY-MM-DD/
        source.md
        newsletter.json
        email.html
        email.txt
        run.json
  src/
    index.ts
    config.ts
    codex.ts
    artifacts.ts
    tasks/
      daily-us-market-overview.ts
```

`packages/email` owns React Email rendering. It should expose a stable render entry point for controlled newsletter JSON. The cron app should not generate, compile, import, or execute React component source produced by Codex.

`@lisbon/integrations-resend` remains the only email delivery adapter.

## 5. Configuration

`apps/crons/config.json` stores business configuration:

```json
{
  "timezone": "Asia/Shanghai",
  "recipients": ["you@example.com"],
  "tasks": [
    {
      "name": "daily-us-market-overview",
      "hhmm": "0800",
      "enabled": true,
      "prompt": "prompts/daily-us-market-overview.md",
      "transformPrompt": "prompts/market-md-to-newsletter-json.md"
    }
  ]
}
```

The `hhmm` value is kept as the cron app's business schedule record, even though systemd performs the actual scheduling. It lets operators verify the timer and config agree, and it preserves a clear place to add more tasks later.

Environment variables store secrets and machine-specific paths:

```env
RESEND_API_KEY=
MAIL_FROM="Lisbon <news@example.com>"
CODEX_BIN=codex
CRONS_ARTIFACTS_DIR=apps/crons/artifacts
```

`CODEX_BIN` defaults to `codex` if omitted. `CRONS_ARTIFACTS_DIR` defaults to `apps/crons/artifacts` if omitted.

Recipients are only configured in `apps/crons/config.json`, not in `.env`.

## 6. Systemd Contract

The first implementation should document systemd units rather than install them automatically.

Example service command:

```bash
pnpm --filter @lisbon/crons task daily-us-market-overview
```

The service must set:

- `WorkingDirectory=/home/dev/Lisbon`
- an environment file containing `RESEND_API_KEY`, `MAIL_FROM`, and optional cron overrides
- a `PATH` that can find `node`, `pnpm`, and `codex`, or absolute paths for those commands

If the Ubuntu host timezone is `Asia/Shanghai`, the timer can use local `08:00`. If the host is not in that timezone, the timer should use `00:00 UTC`, which corresponds to Shanghai 08:00.

## 7. Daily Market Task Flow

For `daily-us-market-overview`:

1. Load and validate cron config.
2. Resolve the task by name and verify it is enabled.
3. Compute the run date in `Asia/Shanghai`.
4. Prepare the artifact directory for the task and date.
5. If `run.json` says the task is already `sent`, stop without sending unless `--force` is passed.
6. Create a running lock for the artifact directory.
7. Execute the first `codex exec` pass with `daily-us-market-overview.md`.
8. Save stdout as `source.md`.
9. Execute the second `codex exec` pass with `market-md-to-newsletter-json.md` and the Markdown as input context.
10. Parse and validate the second pass output as newsletter JSON.
11. Save validated JSON as `newsletter.json`.
12. Render React Email HTML and plain text.
13. Save `email.html` and `email.txt`.
14. Send through Resend to all configured recipients.
15. Save `run.json` with `status: "sent"` and provider message metadata.
16. Release the running lock.

If any step fails, save `run.json` with `status: "failed"` and a useful error message. Failed runs may be retried without `--force`.

## 8. Prompt Files

The first prompt file contains the initial task request:

```text
获取一下昨日美股收盘概览
```

The second prompt instructs Codex to transform the saved Markdown into strict JSON only. It should require:

- no Markdown fences around the JSON
- no prose outside the JSON
- concise sections suitable for email
- source uncertainty called out in content rather than hidden
- output matching the zod schema

## 9. Newsletter JSON Contract

The second pass produces controlled JSON with this shape:

```json
{
  "subject": "昨日美股收盘概览",
  "previewText": "美股主要指数、板块与重点公司表现摘要。",
  "intro": "简短导语",
  "sections": [
    {
      "heading": "市场概览",
      "paragraphs": ["..."],
      "bullets": ["..."]
    }
  ]
}
```

Validation rules:

- `subject`, `previewText`, and `intro` are required non-empty strings.
- `sections` must contain at least one section.
- Each section must have a non-empty `heading`.
- Each section must include at least one paragraph or bullet.
- Paragraphs and bullets must be non-empty strings.

The renderer should escape text through React Email rendering. The cron app must not trust or execute model output as code.

## 10. Email Rendering

`packages/email` should add a rendering path for cron newsletter JSON while keeping the existing workflow-based rendering intact.

The renderer returns:

- `html`
- `text`

The HTML is produced with `@react-email/render` at runtime. No React Email compile command is needed for normal cron execution because the component code is owned by the repository and compiled by the TypeScript runtime/tooling already used by the workspace.

## 11. Email Sending

The cron app constructs an `EmailSender` with `createResendSender(RESEND_API_KEY)` from `@lisbon/integrations-resend`.

It sends:

- `from`: `MAIL_FROM`
- `to`: recipients from `apps/crons/config.json`
- `subject`: newsletter JSON subject
- `html`: rendered React Email HTML
- `text`: rendered plain text

On success, `run.json` stores the provider and provider message id. On failure, `run.json` stores the Resend error message and the task remains retryable.

## 12. Idempotency and Locking

Although systemd owns scheduling, the task runner still needs lightweight idempotency.

Rules:

- A date with `run.json.status === "sent"` will not send again by default.
- `--force` allows an operator to intentionally resend.
- A running lock prevents two concurrent invocations for the same task and date.
- Failed runs can be retried without `--force`.

This protects against manual double starts, systemd catch-up behavior, and overlapping runs.

## 13. Error Handling

- Config validation failure: exit non-zero and do not create send artifacts.
- Missing or disabled task: exit non-zero and do not send.
- First Codex pass failure: save failure status and do not continue.
- Second Codex pass failure: save failure status and do not continue.
- Invalid JSON or zod validation failure: save raw output and validation error, then stop.
- Render failure: save failure status and do not send.
- Resend failure: save failure status with provider error.
- Already sent: exit successfully with a clear skipped message unless `--force` is passed.

## 14. Testing

Add focused tests for:

- cron config schema validation
- newsletter JSON schema validation
- artifact idempotency behavior for `sent`, `failed`, and locked runs
- successful daily task with fake Codex executor and fake email sender
- Codex failure path
- invalid JSON path
- email renderer output containing subject, intro, section heading, and body text

Tests must not call real Codex or real Resend.

## 15. Operator Setup Notes

The final implementation should document required setup:

1. Install dependencies with pnpm.
2. Ensure `codex` is available to the systemd service user.
3. Set `RESEND_API_KEY`.
4. Set `MAIL_FROM` to a verified sender identity for Resend.
5. Configure recipients in `apps/crons/config.json`.
6. Configure systemd service and timer with the repository as working directory.
7. Run the task manually once with a test recipient before enabling the timer.

## 16. Open Decisions Resolved

- Timezone remains `Asia/Shanghai`.
- Recipients live only in `apps/crons/config.json`.
- The daily task sends automatically without human approval.
- systemd timer replaces a resident process.
- The second Codex pass outputs controlled JSON, not generated React component code.
- React Email rendering happens in code at runtime; no per-run React Email compile command is required.
