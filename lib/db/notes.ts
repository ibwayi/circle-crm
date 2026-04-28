import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

export type Note = Database["public"]["Tables"]["notes"]["Row"]
export type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"]

export async function listNotes(
  client: Client,
  customerId: string
): Promise<Note[]> {
  const { data, error } = await client
    .from("notes")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function createNote(
  client: Client,
  input: NoteInsert
): Promise<Note> {
  const { data, error } = await client
    .from("notes")
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(client: Client, id: string): Promise<void> {
  const { error } = await client.from("notes").delete().eq("id", id)
  if (error) throw error
}
