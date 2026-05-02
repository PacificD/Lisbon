import type { z } from 'zod'

import type { draftStatusSchema, workflowItemSchema, workflowResultSchema } from './schemas.ts'

export type DraftStatus = z.infer<typeof draftStatusSchema>
export type WorkflowItem = z.infer<typeof workflowItemSchema>
export type WorkflowResult = z.infer<typeof workflowResultSchema>
