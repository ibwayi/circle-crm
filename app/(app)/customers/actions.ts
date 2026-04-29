"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInsert,
  type CustomerUpdate,
} from "@/lib/db/customers"

export type CustomerActionResult =
  | { ok: true; customerId: string }
  | { ok: false; error: string }

type CreateInput = Omit<CustomerInsert, "user_id">
type UpdateInput = Omit<CustomerUpdate, "user_id" | "id">

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

export async function createCustomerAction(
  input: CreateInput
): Promise<CustomerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const customer = await createCustomer(supabase, {
      ...input,
      user_id: user.id,
    })
    revalidatePath("/customers")
    revalidatePath("/dashboard")
    return { ok: true, customerId: customer.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function updateCustomerAction(
  id: string,
  input: UpdateInput
): Promise<CustomerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const customer = await updateCustomer(supabase, id, input)
    revalidatePath("/customers")
    revalidatePath(`/customers/${id}`)
    revalidatePath("/dashboard")
    return { ok: true, customerId: customer.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function deleteCustomerAction(
  id: string
): Promise<CustomerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    await deleteCustomer(supabase, id)
    revalidatePath("/customers")
    revalidatePath("/dashboard")
    return { ok: true, customerId: id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
