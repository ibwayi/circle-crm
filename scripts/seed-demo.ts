import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// ----------------------------------------------------------------------------
// Demo seed — German-flavored CRM sample data.
//
// Run with:  pnpm seed
//   (which expands to `tsx --env-file=.env.local scripts/seed-demo.ts`)
//
// Idempotent: wipes the demo user's existing customers + notes before
// inserting the standard 15 customers + 10 notes. Cascade FK on notes means
// deleting customers also clears notes; we still delete notes first to be
// explicit (and to make the wipe survive a future schema where notes might
// belong to a different parent).
//
// Refactored in T-11.3: the data and inserter live in lib/seed/demo-data.ts
// so the cron endpoint can reuse them.
// ----------------------------------------------------------------------------

type Customer = Database["public"]["Tables"]["customers"]["Insert"]
type Note = Database["public"]["Tables"]["notes"]["Insert"]

const NOW = Date.now()
const DAY = 1000 * 60 * 60 * 24
const HOUR = 1000 * 60 * 60
const ago = (ms: number) => new Date(NOW - ms).toISOString()

// 15 customers across statuses with German diacritics, German company names,
// realistic German phone numbers, varied created_at / updated_at so the
// dashboard "Recent activity" surfaces a mix.
function makeCustomers(userId: string): Customer[] {
  return [
    // ---- Leads (6) -----------------------------------------------------
    {
      user_id: userId,
      name: "Anna Schäfer",
      email: "anna.schaefer@schaefer-consulting.de",
      phone: "+49 30 1234567",
      company: "Schäfer Consulting GmbH",
      status: "lead",
      value_eur: 12500,
      created_at: ago(14 * DAY),
      updated_at: ago(1 * DAY),
    },
    {
      user_id: userId,
      name: "Tobias Becker",
      email: "tobias@becker-partner.de",
      phone: "+49 89 9876543",
      company: "Becker & Partner",
      status: "lead",
      value_eur: 8000,
      created_at: ago(30 * DAY),
      updated_at: ago(2 * HOUR),
    },
    {
      user_id: userId,
      name: "Lukas Hoffmann",
      email: "lukas.hoffmann@hoffmann-it.de",
      phone: null,
      company: "Hoffmann IT-Lösungen",
      status: "lead",
      value_eur: 25000,
      created_at: ago(7 * DAY),
      updated_at: ago(5 * DAY),
    },
    {
      user_id: userId,
      name: "Marie Köhler",
      email: null,
      phone: null,
      company: "Köhler Logistik",
      status: "lead",
      value_eur: 45000,
      created_at: ago(3 * DAY),
      updated_at: ago(3 * DAY),
    },
    {
      user_id: userId,
      name: "Jan Weber",
      email: "j.weber@weber-industries.de",
      phone: "+49 211 5556677",
      company: "Weber Industries AG",
      status: "lead",
      value_eur: 18000,
      created_at: ago(21 * DAY),
      updated_at: ago(4 * DAY),
    },
    {
      user_id: userId,
      name: "Sophie Lehmann",
      email: "sophie@lehmann.marketing",
      phone: "+49 40 8889999",
      company: "Lehmann Marketing",
      status: "lead",
      value_eur: 6500,
      created_at: ago(2 * DAY),
      updated_at: ago(6 * HOUR),
    },

    // ---- Customers (6) -------------------------------------------------
    {
      user_id: userId,
      name: "Maximilian Hartmann",
      email: "m.hartmann@hartmann-mb.de",
      phone: "+49 711 1112233",
      company: "Hartmann Maschinenbau",
      status: "customer",
      value_eur: 35000,
      created_at: ago(60 * DAY),
      updated_at: ago(7 * DAY),
    },
    {
      user_id: userId,
      name: "Lena Müller",
      email: "lena.mueller@mueller-pharma.de",
      phone: "+49 69 4445566",
      company: "Müller Pharma GmbH",
      status: "customer",
      value_eur: 52000,
      created_at: ago(90 * DAY),
      updated_at: ago(12 * HOUR),
    },
    {
      user_id: userId,
      name: "Felix Bauer",
      email: "felix@bauer-bau.de",
      phone: "+49 30 7778899",
      company: "Bauer Bau & Renovierung",
      status: "customer",
      value_eur: 22000,
      created_at: ago(45 * DAY),
      updated_at: ago(10 * DAY),
    },
    {
      user_id: userId,
      name: "Hannah Vogt",
      email: "h.vogt@vogt-versicherung.de",
      phone: null,
      company: "Vogt Versicherungen",
      status: "customer",
      value_eur: 15000,
      created_at: ago(72 * DAY),
      updated_at: ago(15 * DAY),
    },
    {
      user_id: userId,
      name: "Jonas Schneider",
      email: null,
      phone: "+49 251 3334455",
      company: "Schneider Spedition",
      status: "customer",
      value_eur: 28000,
      created_at: ago(50 * DAY),
      updated_at: ago(2 * DAY),
    },
    {
      user_id: userId,
      name: "Carolin Fischer",
      email: "c.fischer@fischer-kommunikation.de",
      phone: "+49 221 6667788",
      company: "Fischer Kommunikation",
      status: "customer",
      value_eur: 10500,
      created_at: ago(35 * DAY),
      updated_at: ago(8 * DAY),
    },

    // ---- Closed (3) ----------------------------------------------------
    {
      user_id: userId,
      name: "Daniel Wagner",
      email: "d.wagner@wagner-digital.de",
      phone: "+49 30 9990011",
      company: "Wagner Digital",
      status: "closed",
      value_eur: 18000,
      created_at: ago(120 * DAY),
      updated_at: ago(20 * DAY),
    },
    {
      user_id: userId,
      name: "Eva Zimmermann",
      email: "eva.z@zimmermann-personal.de",
      phone: "+49 89 2223344",
      company: "Zimmermann Personal",
      status: "closed",
      value_eur: 75000,
      created_at: ago(180 * DAY),
      updated_at: ago(25 * DAY),
    },
    {
      user_id: userId,
      name: "Niklas Schulz",
      email: null,
      phone: "+49 711 5556677",
      company: "Schulz Energietechnik",
      status: "closed",
      value_eur: 42000,
      created_at: ago(150 * DAY),
      updated_at: ago(30 * DAY),
    },
  ]
}

type SeedNote = {
  customerName: string
  content: string
  created_at: string
}

const NOTES: SeedNote[] = [
  // Tobias Becker (Lead) — 2 notes (most active lead, surfaces in activity)
  {
    customerName: "Tobias Becker",
    content: "Erstkontakt auf der Hannover Messe. Sehr interessiert.",
    created_at: ago(20 * DAY),
  },
  {
    customerName: "Tobias Becker",
    content:
      "Zweites Telefonat positiv. Demo nächste Woche vereinbart.\n\nFolgepunkte:\n- Preisstaffelung erklären\n- Integrationen prüfen",
    created_at: ago(2 * HOUR),
  },
  // Anna Schäfer (Lead)
  {
    customerName: "Anna Schäfer",
    content: "Interessiert an Premium-Tier. Budget noch unklar.",
    created_at: ago(1 * DAY),
  },
  // Lukas Hoffmann (Lead)
  {
    customerName: "Lukas Hoffmann",
    content: "Will erst Q3 entscheiden. Erinnerung in 2 Monaten setzen.",
    created_at: ago(5 * DAY),
  },
  // Maximilian Hartmann (Customer) — 2 notes
  {
    customerName: "Maximilian Hartmann",
    content: "Onboarding abgeschlossen. Sehr zufrieden mit dem Setup.",
    created_at: ago(40 * DAY),
  },
  {
    customerName: "Maximilian Hartmann",
    content: "Quartalsmeeting Ende Juni vereinbart.",
    created_at: ago(7 * DAY),
  },
  // Lena Müller (Customer)
  {
    customerName: "Lena Müller",
    content:
      "Premium-Vertrag verlängert. Upselling-Möglichkeiten prüfen — hat Interesse an Reporting-Modul gezeigt.",
    created_at: ago(12 * HOUR),
  },
  // Felix Bauer (Customer)
  {
    customerName: "Felix Bauer",
    content: "Renovierungsprojekt läuft. Update in 2 Wochen.",
    created_at: ago(10 * DAY),
  },
  // Daniel Wagner (Closed)
  {
    customerName: "Daniel Wagner",
    content: "Abschluss am 15.04. Re-engagement in 6 Monaten planen.",
    created_at: ago(20 * DAY),
  },
  // Eva Zimmermann (Closed)
  {
    customerName: "Eva Zimmermann",
    content:
      "Abgeschlossen mit Premium-Plus-Paket. Sehr guter Empfehlungspartner — Vertriebspartner-Programm anbieten.",
    created_at: ago(25 * DAY),
  },
]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const userId = process.env.DEMO_USER_ID

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
    )
    process.exit(1)
  }
  if (!userId) {
    console.error("Missing DEMO_USER_ID in env.")
    process.exit(1)
  }

  const client = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const customers = makeCustomers(userId)

  console.log("Wiping demo data...")
  const { error: wipeNotesError } = await client
    .from("notes")
    .delete()
    .eq("user_id", userId)
  if (wipeNotesError) {
    console.error("Failed to wipe notes:", wipeNotesError.message)
    process.exit(1)
  }
  const { error: wipeCustomersError } = await client
    .from("customers")
    .delete()
    .eq("user_id", userId)
  if (wipeCustomersError) {
    console.error("Failed to wipe customers:", wipeCustomersError.message)
    process.exit(1)
  }

  console.log(`Inserting ${customers.length} customers...`)
  const { data: insertedCustomers, error: insertCustomersError } = await client
    .from("customers")
    .insert(customers)
    .select("id, name")
  if (insertCustomersError || !insertedCustomers) {
    console.error(
      "Failed to insert customers:",
      insertCustomersError?.message ?? "no data"
    )
    process.exit(1)
  }

  // Map note customer references (by name) to actual customer IDs.
  const customerByName = new Map(
    insertedCustomers.map((c) => [c.name, c.id])
  )
  const notes: Note[] = NOTES.map((n) => {
    const customerId = customerByName.get(n.customerName)
    if (!customerId) {
      throw new Error(
        `Seed note refers to unknown customer "${n.customerName}".`
      )
    }
    return {
      customer_id: customerId,
      user_id: userId,
      content: n.content,
      created_at: n.created_at,
    }
  })

  console.log(`Inserting ${notes.length} notes...`)
  const { error: insertNotesError } = await client.from("notes").insert(notes)
  if (insertNotesError) {
    console.error("Failed to insert notes:", insertNotesError.message)
    process.exit(1)
  }

  console.log("Done.")
  process.exit(0)
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
