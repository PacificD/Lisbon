import { z } from 'zod'

import { DraftStatusSchema, SendProviderSchema } from './types.ts'

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const IsoDateTimeSchema = z.string().datetime({ offset: true })

export const ThemeRecordSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  workflowName: z.string().min(1),
  enabled: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})

export const SubscriberRecordSchema = z.object({
  id: z.string().min(1),
  themeId: z.string().min(1),
  email: z.string().email(),
  createdAt: IsoDateTimeSchema,
})

export const WorkflowMetadataSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
})

export const WorkflowItemSchema = z.object({
  title: z.string().min(1),
  source: z.string().min(1),
  url: z.string().url(),
  summary: z.string().min(1),
  publishedAt: IsoDateTimeSchema.optional(),
  author: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
})

export const WorkflowResultSchema = z.object({
  subject: z.string().min(1),
  previewText: z.string().min(1),
  intro: z.string().min(1),
  items: z.array(WorkflowItemSchema),
})

export const DraftPayloadSchema = z.object({
  theme: ThemeRecordSchema,
  generatedAt: IsoDateTimeSchema,
  workflow: WorkflowMetadataSchema,
  result: WorkflowResultSchema,
})

export const DraftRecordSchema = z.object({
  id: z.string().min(1),
  themeId: z.string().min(1),
  issueDate: IsoDateSchema,
  version: z.number().int().positive(),
  status: DraftStatusSchema,
  subject: z.string().min(1),
  previewText: z.string().min(1),
  draftPayload: DraftPayloadSchema,
  renderedHtml: z.string().min(1),
  approvedAt: IsoDateTimeSchema.nullable(),
  sentAt: IsoDateTimeSchema.nullable(),
  sendProvider: SendProviderSchema.nullable(),
  providerMessageId: z.string().min(1).nullable(),
  errorMessage: z.string().min(1).nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})

export type ThemeRecord = z.infer<typeof ThemeRecordSchema>
export type SubscriberRecord = z.infer<typeof SubscriberRecordSchema>
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>
export type WorkflowItem = z.infer<typeof WorkflowItemSchema>
export type WorkflowResult = z.infer<typeof WorkflowResultSchema>
export type DraftPayload = z.infer<typeof DraftPayloadSchema>
export type DraftRecord = z.infer<typeof DraftRecordSchema>
