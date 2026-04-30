import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

export type Note = Database["public"]["Tables"]["notes"]["Row"]
type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"]

/**
 * Discriminated union: a note's parent is exactly one of company / contact
 * / deal. The DB-level CHECK constraint (originally added in 0007, narrowed
 * to three FKs in 0009) enforces this at runtime; the union catches the
 * easy mistakes at compile time.
 *
 * `userId` is required on every variant — RLS demands it. Adding to the type
 * (rather than asking callers to fill `user_id` in a raw NoteInsert) keeps
 * the surface area minimal; callers don't have to know which FK column maps
 * to which discriminant.
 */
export type CreateNoteInput =
  | { companyId: string; content: string; userId: string }
  | { contactId: string; content: string; userId: string }
  | { dealId: string; content: string; userId: string }

export async function listNotesForCompany(
  client: Client,
  companyId: string
): Promise<Note[]> {
  const { data, error } = await client
    .from("notes")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function listNotesForContact(
  client: Client,
  contactId: string
): Promise<Note[]> {
  const { data, error } = await client
    .from("notes")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function listNotesForDeal(
  client: Client,
  dealId: string
): Promise<Note[]> {
  const { data, error } = await client
    .from("notes")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function createNote(
  client: Client,
  input: CreateNoteInput
): Promise<Note> {
  // Discriminate on which key is present and set exactly one FK column on
  // the Insert. The DB CHECK from 0007 (narrowed in 0009) enforces "exactly
  // one" at runtime.
  let insert: NoteInsert
  const base = { content: input.content, user_id: input.userId }
  if ("companyId" in input) {
    insert = { ...base, company_id: input.companyId }
  } else if ("contactId" in input) {
    insert = { ...base, contact_id: input.contactId }
  } else {
    insert = { ...base, deal_id: input.dealId }
  }

  const { data, error } = await client
    .from("notes")
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(client: Client, id: string): Promise<void> {
  const { error } = await client.from("notes").delete().eq("id", id)
  if (error) throw error
}
