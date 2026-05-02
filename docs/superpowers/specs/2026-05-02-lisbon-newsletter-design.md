# Lisbon Newsletter Design Spec

Date: 2026-05-02
Status: Drafted for review

## 1. Overview

Lisbon Newsletter is a local-first themed daily newsletter system for real subscribers.

The operator manages themes and subscribers via CLI, manually triggers newsletter generation for a theme, reviews the generated draft, approves it, and then sends the email to all subscribers of that theme.

The first version does not provide a public subscription page, user self-service, an operator web admin, automatic scheduling, or fully automated sending.

## 2. Goals

- Support multiple themes such as tech and finance.
- Associate each theme with a workflow implementation by `workflow_name`.
- Maintain subscribers per theme.
- Allow the operator to manually trigger newsletter generation for a theme and date.
- Render newsletter HTML with React Email.
- Require manual operator review before sending.
- Send one approved newsletter to all subscribers of one theme.
- Run locally.

## 3. Non-Goals

- Public subscription page.
- User login, registration, unsubscribe self-service.
- Operator web admin UI.
- Fully automatic sending.
- Advanced source-level crawling strategy management.
- Standalone source management in CLI.
- Draft content editing in CLI.
- Batch subscriber import.
- Automatic retry.
- Remote execution or remote deployment in this iteration.
- Guarantee that workflows can run in Cloudflare runtime.

## 4. Product Scope Clarifications

### 4.1 Operator Entry Points

The first version provides two local entry points:

- `apps/cli` as the primary operator interface.
- `apps/server` as a local Hono API process that exposes the same application capabilities.

The operator is expected to use CLI for the core workflow. The local server exists to preserve service boundaries and support future expansion, but the product must remain usable without requiring a long-running server process.

### 4.2 Workflow and Source Ownership

Each theme references a workflow implementation through `workflow_name`.

Information sources are defined inside workflow code, not in the database and not via CLI CRUD. For example:

- a frontend workflow can define Hacker News, GitHub Trending, and X as sources in its TypeScript module
- a finance workflow can define Yahoo Finance or other finance-specific sources in its own module

As a result, the first version removes standalone "source management" from the product surface. Theme management covers theme metadata and workflow binding only.

### 4.3 Email Sending Provider

The first version uses `Resend` as the only email sending provider.

This choice reduces platform coupling and simplifies local-first operation. The architecture still keeps a thin `EmailSender` interface so the core application logic does not depend directly on Resend SDK or API details.

## 5. High-Level Architecture

The monorepo is structured around shared application services with thin adapters on top.

Suggested package layout:

- `apps/cli`
- `apps/server`
- `packages/core`
- `packages/db`
- `packages/workflows`
- `packages/email`
- `packages/shared`

Responsibilities:

- `apps/cli`
  - Parse commands
  - Display summaries and confirmations
  - Invoke shared application services directly
- `apps/server`
  - Expose local Hono routes
  - Translate HTTP requests into shared application service calls
- `packages/core`
  - Domain types
  - State transition rules
  - Application services
  - Repository and adapter interfaces
- `packages/db`
  - Supabase-backed repository implementations
- `packages/workflows`
  - Workflow implementations and workflow registry
- `packages/email`
  - React Email templates and HTML rendering
- `packages/shared`
  - Shared schemas, config helpers, utilities

Core call paths:

- `CLI command -> application service -> repository/workflow/email sender`
- `Hono route -> application service -> repository/workflow/email sender`

Business logic must not be implemented inside CLI commands or Hono routes.

## 6. Data Model

The first version uses three core business tables.

### 6.1 `themes`

Purpose:

- Store operator-managed theme metadata.

Suggested fields:

- `id`
- `slug`
- `name`
- `workflow_name`
- `enabled`
- `created_at`
- `updated_at`

Rules:

- `slug` must be unique.
- `workflow_name` must map to a registered workflow implementation in code.
- The system should validate this mapping on use and, where practical, on theme creation/update.

### 6.2 `theme_subscribers`

Purpose:

- Store subscription relations between themes and email addresses.

Suggested fields:

- `id`
- `theme_id`
- `email`
- `created_at`

Rules:

- Unique constraint on `(theme_id, email)`.
- One email may subscribe to multiple themes.
- One theme may have multiple subscriber emails.

### 6.3 `newsletter_drafts`

Purpose:

- Store generated drafts, their rendered HTML, and lifecycle status.

Suggested fields:

- `id`
- `theme_id`
- `issue_date`
- `version`
- `status`
- `subject`
- `preview_text`
- `draft_payload_json`
- `rendered_html`
- `approved_at`
- `sent_at`
- `send_provider`
- `provider_message_id`
- `error_message`
- `created_at`
- `updated_at`

Notes:

- `draft_payload_json` stores the workflow output in normalized form.
- `rendered_html` stores the rendered React Email HTML used for preview and sending.
- `send_provider` will be `resend` in the first version.

## 7. Draft State Machine

Supported statuses:

- `draft`
- `approved`
- `sent`
- `failed`

Behavior:

- A successful generation creates a new record with status `draft`.
- Approving a draft transitions `draft -> approved`.
- Sending a draft transitions `approved -> sent`.
- Generation or sending failure marks the relevant record as `failed`.

Constraints:

- For one `theme_id + issue_date`, multiple drafts may exist.
- Multiple versions may be generated for the same theme and day.
- Multiple `approved` records may exist for the same theme and day.
- Only one `sent` record may exist for the same theme and day.

Versioning:

- `version` is scoped by `theme_id + issue_date`.
- New generation uses `max(version) + 1` for that theme and date.

Sending behavior:

- Default sending target is the latest approved draft for the theme and date.
- CLI also supports explicitly choosing a draft by `id` or `version`.
- If a `sent` record already exists for that theme and date, sending must be rejected.

## 8. Workflow Contract

Each workflow is a code module with a standard interface, not an unstructured script.

Each workflow module should export:

- `metadata`
- `run(input): Promise<WorkflowResult>`

### 8.1 Workflow Metadata

Suggested metadata fields:

- `name`
- `displayName`
- `description`

### 8.2 Workflow Input

Suggested input fields:

- `theme`
- `issueDate`
- `config`
- `logger`

The exact shape may evolve during implementation, but the first version must keep the workflow input small and explicitly typed.

### 8.3 Workflow Output

The first version standardizes workflow output as a full draft payload, not raw items only and not final HTML.

Suggested `WorkflowResult` fields:

- `subject`
- `previewText`
- `intro`
- `items`

Each item must include at least:

- `title`
- `source`
- `url`
- `summary`

Optional item fields may include:

- `publishedAt`
- `author`
- `tags`

The system owns persistence, rendering, approval, and sending. Workflows own content gathering and draft payload generation.

## 9. End-to-End Flow

### 9.1 Generate Draft

1. Operator runs `draft generate --theme <slug> [--date YYYY-MM-DD]`.
2. Application service loads the theme by slug.
3. Service validates that `workflow_name` resolves to a registered workflow.
4. Workflow executes locally and returns a `WorkflowResult`.
5. React Email renderer converts the result into HTML.
6. Service computes the next version for `theme + issue_date`.
7. Service persists the draft record with status `draft`.

### 9.2 Review Draft

1. Operator lists drafts for a theme and date.
2. Operator views a draft summary in the terminal.
3. Operator may also write or open an HTML preview for manual inspection.
4. Operator approves one chosen draft.

The first version does not allow editing draft content during review.

### 9.3 Send Newsletter

1. Operator sends the latest approved draft or a specific approved draft by `id` or `version`.
2. Service verifies that no `sent` draft already exists for the same theme and date.
3. Service loads all subscriber emails for the theme.
4. Service sends the rendered HTML through Resend.
5. On success, the chosen draft is marked `sent`.
6. On failure, the chosen draft is marked `failed` and stores the error message.

### 9.4 Failure Recovery

The first version does not implement a dedicated retry command or automatic retry.

Operator recovery is manual:

- rerun generation if generation failed or content is unsatisfactory
- rerun send command if sending failed and the operator wants to try again

## 10. CLI Surface

The CLI is command-oriented, not a heavy terminal UI.

### 10.1 Theme Commands

- `theme create --slug <slug> --name <name> --workflow <workflowName>`
- `theme list`
- `theme update --slug <slug> [--name ...] [--workflow ...] [--enabled ...]`

### 10.2 Subscriber Commands

- `subscriber add --theme <slug> --email <email>`
- `subscriber remove --theme <slug> --email <email>`
- `subscriber list --theme <slug>`

### 10.3 Draft Commands

- `draft generate --theme <slug> [--date YYYY-MM-DD]`
- `draft list --theme <slug> [--date YYYY-MM-DD]`
- `draft show --theme <slug> --date YYYY-MM-DD [--version N | --id ...]`
- `draft approve --theme <slug> --date YYYY-MM-DD [--version N | --id ...]`

### 10.4 Send Commands

- `send issue --theme <slug> --date YYYY-MM-DD [--version N | --id ...]`

Behavior:

- If no draft selector is provided, send the latest approved draft.
- The CLI should provide confirmation before sending.

### 10.5 Preview Strategy

`draft show` should default to terminal summary output.

The first version should support preview file output, for example by writing HTML to a local preview file for browser inspection.

Automatic browser opening may be implemented only if it remains simple and cross-platform-safe. It is not required for the first version.

## 11. Configuration

The system should use a shared typed configuration layer.

Required configuration for the first version:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `PREVIEW_OUTPUT_DIR`

Optional configuration:

- `DEFAULT_ISSUE_DATE_TIMEZONE`

Notes:

- CLI and local server both use service-level Supabase credentials because they act as trusted operator tools.
- Workflow-specific external source credentials may be added as additional environment variables as needed by individual workflow modules.

## 12. Integration Boundaries

### 12.1 Database Layer

`packages/db` should hide Supabase-specific access details behind repository implementations. Core application services must depend on interfaces rather than direct Supabase calls.

### 12.2 Email Rendering

`packages/email` is responsible for:

- converting normalized draft payloads into React Email components
- rendering HTML for preview and send

It is not responsible for sending email.

### 12.3 Email Sending

The first version uses a single `EmailSender` abstraction with one implementation: `ResendEmailSender`.

Core code should depend on an interface such as:

- `send({ from, to, subject, html, text? })`

The implementation should return provider-specific identifiers that can be stored as `provider_message_id`.

### 12.4 Workflow Registry

`packages/workflows` should expose a registry lookup such as:

- `getWorkflow(name)`

This keeps theme-to-workflow binding explicit and testable.

## 13. Testing Strategy

The first version should prioritize correctness of workflow contracts and draft lifecycle rules.

### 13.1 Unit Tests

At minimum:

- status transition rules
- version increment logic
- latest approved selection logic
- duplicate-send prevention for one theme and date

### 13.2 Workflow Contract Tests

Each workflow should be checked against a schema or type-level contract to ensure it returns a valid `WorkflowResult`.

### 13.3 Email Rendering Tests

Given a valid draft payload, React Email rendering should produce stable HTML without runtime failure.

### 13.4 Repository Integration Tests

Repository implementations should cover:

- theme CRUD basics
- subscriber add/remove/list
- draft insert/query/update flows

### 13.5 CLI Smoke Tests

At minimum:

- command parsing
- service invocation wiring for core commands

Heavy end-to-end browser-style testing is unnecessary for the first version.

## 14. Future Extensions

The architecture should leave room for later additions without making them part of the first version:

- remote CLI mode
- remote deployment
- additional email providers
- richer draft review tooling
- source management abstractions
- scheduled generation
- batch subscriber import
- draft editing

These are intentionally excluded from the current scope.

## 15. Implementation Guidance

The implementation should favor:

- small shared services with explicit interfaces
- workflow isolation by theme
- transport-agnostic business logic
- local-first operation
- straightforward CLI commands over complex terminal UI state

The implementation should avoid:

- embedding business logic in CLI commands or Hono handlers
- storing source definitions in the database
- coupling core flow to a specific runtime beyond local Node execution
- introducing extra entities such as source configs, send logs, or workflow run history before a concrete need exists
