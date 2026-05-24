import { z } from 'zod'

const nonEmptyStringArraySchema = z.array(z.string().trim().min(1)).optional()

export const newsletterSectionSchema = z
  .object({
    heading: z.string().trim().min(1),
    paragraphs: nonEmptyStringArraySchema,
    bullets: nonEmptyStringArraySchema,
  })
  .refine((section) => Boolean(section.paragraphs?.length || section.bullets?.length), {
    message: 'Each section must include at least one paragraph or bullet',
  })

export const newsletterJsonSchema = z.object({
  subject: z.string().trim().min(1),
  previewText: z.string().trim().min(1),
  intro: z.string().trim().min(1),
  sections: z.array(newsletterSectionSchema).min(1),
})

export type NewsletterJson = z.infer<typeof newsletterJsonSchema>

export function parseNewsletterJson(output: string): NewsletterJson {
  let parsed: unknown

  try {
    parsed = JSON.parse(output.trim())
  } catch (error) {
    throw new Error(`Codex output was not valid JSON: ${error instanceof Error ? error.message : 'Unknown parse error'}`)
  }

  return newsletterJsonSchema.parse(parsed)
}
