import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Shared demo seed used by both the CLI script (scripts/seed-demo.ts) and
// the nightly cron endpoint (app/api/cron/reset-demo/route.ts). Keep the
// data definitions here so the two paths can never drift.

type AdminClient = SupabaseClient<Database>
type Customer = Database["public"]["Tables"]["customers"]["Insert"]
type Note = Database["public"]["Tables"]["notes"]["Insert"]

export type SeedResult = {
  customersInserted: number
  notesInserted: number
}

const DAY = 1000 * 60 * 60 * 24
const HOUR = 1000 * 60 * 60
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

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

const NOTE_TEMPLATES: SeedNote[] = [
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
  {
    customerName: "Anna Schäfer",
    content: "Interessiert an Premium-Tier. Budget noch unklar.",
    created_at: ago(1 * DAY),
  },
  {
    customerName: "Lukas Hoffmann",
    content: "Will erst Q3 entscheiden. Erinnerung in 2 Monaten setzen.",
    created_at: ago(5 * DAY),
  },
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
  {
    customerName: "Lena Müller",
    content:
      "Premium-Vertrag verlängert. Upselling-Möglichkeiten prüfen — hat Interesse an Reporting-Modul gezeigt.",
    created_at: ago(12 * HOUR),
  },
  {
    customerName: "Felix Bauer",
    content: "Renovierungsprojekt läuft. Update in 2 Wochen.",
    created_at: ago(10 * DAY),
  },
  {
    customerName: "Daniel Wagner",
    content: "Abschluss am 15.04. Re-engagement in 6 Monaten planen.",
    created_at: ago(20 * DAY),
  },
  {
    customerName: "Eva Zimmermann",
    content:
      "Abgeschlossen mit Premium-Plus-Paket. Sehr guter Empfehlungspartner — Vertriebspartner-Programm anbieten.",
    created_at: ago(25 * DAY),
  },
]

/**
 * Wipe and re-seed the demo user. Caller must pass a Supabase client backed
 * by the service role key (RLS is bypassed). Reads `DEMO_USER_ID` from env;
 * throws if it is missing or if any DB call fails.
 *
 * Idempotent — running twice produces the same result.
 */
export async function seedDemoData(client: AdminClient): Promise<SeedResult> {
  const userId = process.env.DEMO_USER_ID
  if (!userId) {
    throw new Error("DEMO_USER_ID is not set")
  }

  // Wipe in order: notes first, then customers. The FK cascade on customers
  // would clean notes anyway, but the explicit order is clearer and would
  // survive any future schema where notes don't cascade.
  const { error: wipeNotesError } = await client
    .from("notes")
    .delete()
    .eq("user_id", userId)
  if (wipeNotesError) {
    throw new Error(`Failed to wipe notes: ${wipeNotesError.message}`)
  }
  const { error: wipeCustomersError } = await client
    .from("customers")
    .delete()
    .eq("user_id", userId)
  if (wipeCustomersError) {
    throw new Error(`Failed to wipe customers: ${wipeCustomersError.message}`)
  }

  const customers = makeCustomers(userId)
  const { data: insertedCustomers, error: insertCustomersError } = await client
    .from("customers")
    .insert(customers)
    .select("id, name")
  if (insertCustomersError || !insertedCustomers) {
    throw new Error(
      `Failed to insert customers: ${insertCustomersError?.message ?? "no data"}`
    )
  }

  const customerByName = new Map(
    insertedCustomers.map((c) => [c.name, c.id])
  )
  const notes: Note[] = NOTE_TEMPLATES.map((n) => {
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

  const { error: insertNotesError } = await client.from("notes").insert(notes)
  if (insertNotesError) {
    throw new Error(`Failed to insert notes: ${insertNotesError.message}`)
  }

  return {
    customersInserted: insertedCustomers.length,
    notesInserted: notes.length,
  }
}
