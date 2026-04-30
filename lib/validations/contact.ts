import { z } from "zod"

// Form fields are mostly strings (HTML inputs are always strings); the
// exception is company_id which is `string | null` because the Combobox
// returns null for the "(No company)" option directly. Empty strings
// elsewhere are mapped to null at submit time.
export const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().max(100),
  email: z.union([
    z.literal(""),
    z.string().email("Please enter a valid email address."),
  ]),
  phone: z.string().max(50),
  position: z.string().max(200),
  linkedin_url: z.union([
    z.literal(""),
    z.string().url("Please enter a valid URL."),
  ]),
  // HTML date inputs return YYYY-MM-DD or empty string. We accept either;
  // empty becomes null on submit.
  birthday: z.string(),
  // UUID or null. The combobox emits null directly for the "(No company)"
  // option — no empty-string special case needed.
  company_id: z.string().uuid().nullable(),
})

export type ContactFormValues = z.infer<typeof contactSchema>
