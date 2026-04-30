import { createClient } from "@supabase/supabase-js"
import { seedDemoData } from "@/lib/seed/demo-data"
import type { Database } from "@/types/database"

// CLI wrapper around lib/seed/demo-data.ts. Run with `pnpm seed`
// (which expands to `tsx --env-file=.env.local scripts/seed-demo.ts`).

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
    )
    process.exit(1)
  }

  const client = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log("Seeding demo data...")
  try {
    const result = await seedDemoData(client)
    console.log(
      `Inserted ${result.companiesInserted} companies, ${result.contactsInserted} contacts, ${result.dealsInserted} deals (${result.dealContactsInserted} contact links), ${result.notesInserted} notes.`
    )
    console.log("Done.")
    process.exit(0)
  } catch (e) {
    console.error("Seed failed:", e instanceof Error ? e.message : e)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
