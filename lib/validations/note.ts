import { z } from "zod"

// Trim happens in the schema so users can't sneak whitespace-only notes
// past min(1). The form itself stores the user's untrimmed input — we
// re-trim explicitly in the action call to be safe.
export const noteSchema = z.object({
  content: z.string().trim().min(1, "Note can't be empty").max(2000),
})

export type NoteFormValues = z.infer<typeof noteSchema>
