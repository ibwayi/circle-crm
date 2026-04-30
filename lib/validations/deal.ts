import { z } from "zod"

export const DEAL_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const
export type DealStageValue = (typeof DEAL_STAGES)[number]

export const DEAL_PRIORITIES = ["low", "medium", "high"] as const
export type DealPriority = (typeof DEAL_PRIORITIES)[number]

// Free-text in the DB (no CHECK constraint), but the form constrains the
// surface to a fixed German-language set so the dropdown can re-display
// every stored value. Seed data uses these labels too — see lib/seed.
export const DEAL_SOURCES = [
  "LinkedIn",
  "Empfehlung",
  "Kaltakquise",
  "Inbound",
  "Event",
  "Website",
  "Sonstige",
] as const
export type DealSource = (typeof DEAL_SOURCES)[number]

// Form fields are mostly strings (HTML inputs return strings); company_id
// and primary_contact_id are `string | null` because the comboboxes emit
// null directly for the "none" option.
//
// Numeric inputs (value_eur, probability) stay as strings here. Empty
// becomes null at submit; the refine check protects against junk.
export const dealSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  value_eur: z
    .string()
    .refine(
      (v) =>
        v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Enter a non-negative number, or leave empty."
    ),
  stage: z.enum(DEAL_STAGES),
  priority: z.enum(DEAL_PRIORITIES),
  source: z.string().max(200),
  // HTML date input returns YYYY-MM-DD or empty.
  expected_close_date: z.string(),
  probability: z
    .string()
    .refine((v) => {
      if (v.trim() === "") return true
      const n = Number(v)
      return !Number.isNaN(n) && n >= 0 && n <= 100
    }, "Probability must be between 0 and 100."),
  company_id: z.string().uuid().nullable(),
  // Only used in create mode — see DealForm. Empty string isn't a valid
  // option; the combobox always emits a UUID or null.
  primary_contact_id: z.string().uuid().nullable(),
})

export type DealFormValues = z.infer<typeof dealSchema>
