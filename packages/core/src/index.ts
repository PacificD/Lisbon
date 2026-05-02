export { createThemeRecord } from './domain/theme.ts'
export { createSubscriberRecord } from './domain/subscriber.ts'
export {
  approveDraft,
  assertCanSendDraft,
  createDraftRecord,
  getLatestApprovedDraft,
  getNextDraftVersion,
  markDraftFailed,
  markDraftSent,
} from './domain/draft.ts'
export type { DraftRepository, SubscriberRepository, ThemeRepository } from './ports/repositories.ts'
export type {
  EmailMessage,
  EmailSendResult,
  EmailSender,
  Logger,
  WorkflowDefinition,
  WorkflowRegistry,
  WorkflowRunInput,
} from './ports/runtime.ts'
