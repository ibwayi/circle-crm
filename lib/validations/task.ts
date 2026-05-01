import { z } from "zod"

export const TASK_PRIORITIES = ["low", "medium", "high"] as const
export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number]

// Form fields are strings (HTML inputs are strings); empties → null at
// the submit boundary, same pattern as the other forms in the project.
//
// Parent picker shape — string-encoded so the <Select> can hold a
// single value. The form decodes it into `{ type, ...id }` before
// passing to the server action.
export const TASK_PARENT_NONE = "__standalone__"

export const taskSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(200),
  notes: z.string().max(2000),
  // Postgres date — yyyy-MM-dd or empty.
  due_date: z.string(),
  // Postgres time — HH:mm or empty (HTML5 <input type="time"> emits HH:mm).
  due_time: z.string(),
  priority: z.enum(TASK_PRIORITIES),
  // Parent encoded as "type:id" or the standalone sentinel. Decoded by
  // the form's submit handler. The "deal:<uuid>" / "contact:<uuid>" /
  // "company:<uuid>" / "__standalone__" shape lets the picker sit in a
  // single Select.
  parent_value: z.string(),
})

export type TaskFormValues = z.infer<typeof taskSchema>
