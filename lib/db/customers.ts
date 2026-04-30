import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { escapeIlike } from "@/lib/db/_utils"

type Client = SupabaseClient<Database>

export type Customer = Database["public"]["Tables"]["customers"]["Row"]
export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"]
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"]

// gen-types reports `status` as `string` (CHECK constraints aren't reflected).
// The DB enforces the union — we narrow it in app code.
export type CustomerStatus = "lead" | "customer" | "closed"

export type CustomerStats = {
  total: number
  leads: number
  customers: number
  closed: number
  pipelineValueEur: number
}

export async function listCustomers(
  client: Client,
  opts?: { status?: CustomerStatus; search?: string }
): Promise<Customer[]> {
  let query = client
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false })

  if (opts?.status) {
    query = query.eq("status", opts.status)
  }

  if (opts?.search && opts.search.trim().length > 0) {
    const term = escapeIlike(opts.search.trim())
    query = query.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function listRecentlyUpdated(
  client: Client,
  limit: number = 5
): Promise<Customer[]> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getCustomer(
  client: Client,
  id: string
): Promise<Customer | null> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createCustomer(
  client: Client,
  input: CustomerInsert
): Promise<Customer> {
  const { data, error } = await client
    .from("customers")
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(
  client: Client,
  id: string,
  input: CustomerUpdate
): Promise<Customer> {
  const { data, error } = await client
    .from("customers")
    .update(input)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomer(
  client: Client,
  id: string
): Promise<void> {
  const { error } = await client.from("customers").delete().eq("id", id)
  if (error) throw error
}

export async function getCustomerStats(client: Client): Promise<CustomerStats> {
  const { data, error } = await client
    .from("customers")
    .select("status, value_eur")
  if (error) throw error

  const stats: CustomerStats = {
    total: data.length,
    leads: 0,
    customers: 0,
    closed: 0,
    pipelineValueEur: 0,
  }

  for (const row of data) {
    switch (row.status) {
      case "lead":
        stats.leads++
        break
      case "customer":
        stats.customers++
        break
      case "closed":
        stats.closed++
        break
    }
    if (row.status !== "closed" && row.value_eur !== null) {
      stats.pipelineValueEur += row.value_eur
    }
  }

  return stats
}
