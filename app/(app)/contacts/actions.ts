"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createContact,
  deleteContact,
  updateContact,
  type ContactInsert,
  type ContactUpdate,
} from "@/lib/db/contacts"
import { createClient } from "@/lib/supabase/server"

export type ContactActionResult =
  | { ok: true; contactId: string }
  | { ok: false; error: string }

type CreateContactInput = Omit<
  ContactInsert,
  "user_id" | "id" | "created_at" | "updated_at" | "_migrated_from_customer_id"
>
type UpdateContactInput = Omit<
  ContactUpdate,
  "user_id" | "id" | "created_at" | "updated_at" | "_migrated_from_customer_id"
>

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

export async function createContactAction(
  input: CreateContactInput
): Promise<ContactActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const contact = await createContact(supabase, {
      ...input,
      user_id: user.id,
    })
    revalidatePath("/contacts")
    if (contact.company_id) {
      revalidatePath(`/companies/${contact.company_id}`)
    }
    return { ok: true, contactId: contact.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function updateContactAction(
  id: string,
  input: UpdateContactInput
): Promise<ContactActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const contact = await updateContact(supabase, id, input)
    revalidatePath("/contacts")
    revalidatePath(`/contacts/${id}`)
    if (contact.company_id) {
      revalidatePath(`/companies/${contact.company_id}`)
    }
    return { ok: true, contactId: contact.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function deleteContactAction(id: string): Promise<void> {
  const supabase = await createClient()
  await deleteContact(supabase, id)
  revalidatePath("/contacts")
  revalidatePath(`/contacts/${id}`)
  redirect("/contacts")
}
