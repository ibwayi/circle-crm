"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createCompany,
  deleteCompany,
  updateCompany,
  type CompanyInsert,
  type CompanyUpdate,
} from "@/lib/db/companies"
import { createClient } from "@/lib/supabase/server"

export type CompanyActionResult =
  | { ok: true; companyId: string }
  | { ok: false; error: string }

// Auto-generated columns are stripped — callers shouldn't and can't set
// them. user_id is filled by the action from the authenticated session.
type CreateCompanyInput = Omit<
  CompanyInsert,
  "user_id" | "id" | "created_at" | "updated_at"
>
type UpdateCompanyInput = Omit<
  CompanyUpdate,
  "user_id" | "id" | "created_at" | "updated_at"
>

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

export async function createCompanyAction(
  input: CreateCompanyInput
): Promise<CompanyActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const company = await createCompany(supabase, {
      ...input,
      user_id: user.id,
    })
    revalidatePath("/companies")
    return { ok: true, companyId: company.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function updateCompanyAction(
  id: string,
  input: UpdateCompanyInput
): Promise<CompanyActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const company = await updateCompany(supabase, id, input)
    revalidatePath("/companies")
    revalidatePath(`/companies/${id}`)
    return { ok: true, companyId: company.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function deleteCompanyAction(id: string): Promise<void> {
  // Distinct from create/update: deletes navigate the user away to the
  // list view rather than returning a result the caller can render.
  // Errors here surface as a thrown exception (caller's try/catch +
  // toast.error). On success we redirect — no return.
  const supabase = await createClient()
  await deleteCompany(supabase, id)
  revalidatePath("/companies")
  revalidatePath(`/companies/${id}`)
  redirect("/companies")
}

// -----------------------------------------------------------------------------
// Phase 29 — bulk actions for the multi-select UX on /companies.
// Single .in("id", ids) per call. RLS scopes to the user. Note that
// deleting a company nulls out company_id on linked contacts/deals
// via the schema's ON DELETE SET NULL — it doesn't cascade.
// -----------------------------------------------------------------------------

export type BulkCompaniesActionResult =
  | { ok: true; affected: number }
  | { ok: false; error: string }

export async function bulkDeleteCompaniesAction(
  ids: string[]
): Promise<BulkCompaniesActionResult> {
  if (ids.length === 0) return { ok: true, affected: 0 }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const { error } = await supabase.from("companies").delete().in("id", ids)
    if (error) throw error
    revalidatePath("/companies")
    revalidatePath("/contacts")
    revalidatePath("/deals")
    revalidatePath("/dashboard")
    return { ok: true, affected: ids.length }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
