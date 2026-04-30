"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  createDeal,
  deleteDeal,
  linkContactToDeal,
  setDealPrimaryContact,
  unlinkContactFromDeal,
  updateDeal,
  updateDealStage,
  type DealInsert,
  type DealStage,
  type DealUpdate,
} from "@/lib/db/deals"

const dealStageSchema: z.ZodType<DealStage> = z.enum([
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
])

export type DealActionResult =
  | { ok: true; dealId: string }
  | { ok: false; error: string }

export type DealContactActionResult =
  | { ok: true }
  | { ok: false; error: string }

// Strip server-managed columns from the create/update inputs at the type
// level. user_id comes from the session, closed_at is trigger-managed,
// the rest are server defaults.
type CreateDealInput = Omit<
  DealInsert,
  "user_id" | "id" | "created_at" | "updated_at" | "closed_at"
>
type UpdateDealInput = Omit<
  DealUpdate,
  "user_id" | "id" | "created_at" | "updated_at" | "closed_at"
>

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

export async function updateDealStageAction(
  id: string,
  stage: DealStage
): Promise<DealActionResult> {
  // Validate at the boundary — clients can pass anything via a server action
  // call, and the DB CHECK would reject but as a less friendly Postgres error.
  const parsed = dealStageSchema.safeParse(stage)
  if (!parsed.success) {
    return { ok: false, error: "Invalid stage value." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const deal = await updateDealStage(supabase, id, parsed.data)
    revalidatePath("/deals")
    revalidatePath(`/deals/${id}`)
    revalidatePath("/dashboard")
    return { ok: true, dealId: deal.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function createDealAction(
  input: CreateDealInput,
  primaryContactId: string | null
): Promise<DealActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const deal = await createDeal(
      supabase,
      { ...input, user_id: user.id },
      primaryContactId ?? undefined
    )
    revalidatePath("/deals")
    revalidatePath("/dashboard")
    if (deal.company_id) revalidatePath(`/companies/${deal.company_id}`)
    if (primaryContactId) revalidatePath(`/contacts/${primaryContactId}`)
    return { ok: true, dealId: deal.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function updateDealAction(
  id: string,
  input: UpdateDealInput
): Promise<DealActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const deal = await updateDeal(supabase, id, input)
    revalidatePath("/deals")
    revalidatePath(`/deals/${id}`)
    revalidatePath("/dashboard")
    if (deal.company_id) revalidatePath(`/companies/${deal.company_id}`)
    return { ok: true, dealId: deal.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function deleteDealAction(id: string): Promise<void> {
  const supabase = await createClient()
  await deleteDeal(supabase, id)
  revalidatePath("/deals")
  revalidatePath("/dashboard")
  redirect("/deals")
}

export async function linkDealContactAction(
  dealId: string,
  contactId: string,
  isPrimary: boolean
): Promise<DealContactActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    await linkContactToDeal(supabase, dealId, contactId, { isPrimary })
    revalidatePath(`/deals/${dealId}`)
    revalidatePath(`/contacts/${contactId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function setDealPrimaryContactAction(
  dealId: string,
  contactId: string
): Promise<DealContactActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    await setDealPrimaryContact(supabase, dealId, contactId)
    revalidatePath(`/deals/${dealId}`)
    revalidatePath(`/contacts/${contactId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function unlinkDealContactAction(
  dealId: string,
  contactId: string
): Promise<DealContactActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    await unlinkContactFromDeal(supabase, dealId, contactId)
    revalidatePath(`/deals/${dealId}`)
    revalidatePath(`/contacts/${contactId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
