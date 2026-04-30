import { z } from "zod"

export const COMPANY_SIZE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-1000",
  "1000+",
] as const

export type CompanySizeRange = (typeof COMPANY_SIZE_RANGES)[number]

// Form fields are strings (HTML inputs are always strings). Optional fields
// allow empty string; the form's submit handler maps "" → null before
// hitting the DB.
export const companySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  website: z.union([
    z.literal(""),
    z.string().url("Please enter a valid URL."),
  ]),
  industry: z.string().max(200),
  phone: z.string().max(50),
  email: z.union([
    z.literal(""),
    z.string().email("Please enter a valid email address."),
  ]),
  address: z.string().max(500),
  // Empty string represents "not set" in the dropdown; the schema accepts
  // that alongside the five canonical size ranges.
  size_range: z.union([z.literal(""), z.enum(COMPANY_SIZE_RANGES)]),
})

export type CompanyFormValues = z.infer<typeof companySchema>
