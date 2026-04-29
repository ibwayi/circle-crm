import { z } from "zod"

// Form fields are strings (HTML inputs are always strings). Conversion to
// the DB shape (null vs number, etc.) happens at the form-submit boundary
// via formValuesToInput in customer-form.tsx.
export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z
    .string()
    .refine(
      (v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      "Please enter a valid email"
    ),
  phone: z.string().max(50),
  company: z.string().max(200),
  status: z.enum(["lead", "customer", "closed"]),
  value_eur: z
    .string()
    .refine(
      (v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number"
    ),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
