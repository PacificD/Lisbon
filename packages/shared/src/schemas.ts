import { z } from 'zod'

export const draftStatusSchema = z.enum(['draft', 'approved', 'sent', 'failed'])

export const workflowItemSchema = z.object({
  title: z.string().min(1),
  source: z.string().min(1),
  url: z.string().url(),
  summary: z.string().min(1),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  author: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
})

export const workflowResultSchema = z.object({
  subject: z.string().min(1),
  previewText: z.string().min(1),
  intro: z.string().min(1),
  items: z.array(workflowItemSchema),
})
