import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Phase 22 (TODO): rewrite this file as a real 2.0 entity seed —
// companies + contacts + deals (with primary contacts via deal_contacts) +
// polymorphic notes scoped to whichever parent fits each note's content.
//
// Phase 16.5 stub: the original seed targeted the `customers` table, which
// was retired by Migration 0009. Rather than ship a half-converted seed,
// this file became a no-op so the CLI script and the nightly cron route
// keep compiling and running without trying to write to a non-existent
// table. The demo user's data was already populated by 0008's migration
// and is what recruiters see today; until Phase 22 ships a real seed,
// running this is a no-op (the existing data simply persists).
//
// The `SeedResult` shape is preserved so callers (`scripts/seed-demo.ts`
// and `app/api/cron/reset-demo/route.ts`) keep type-checking. The fields
// will read 0/0 — Phase 22 redesigns the result to surface counts for the
// new entity types.

type AdminClient = SupabaseClient<Database>

export type SeedResult = {
  customersInserted: number
  notesInserted: number
}

export async function seedDemoData(_client: AdminClient): Promise<SeedResult> {
  // _client is unused while this is a stub; Phase 22 will use it. Same
  // void-the-name idiom as `updateDeal`'s stripped-immutable destructure
  // in lib/db/deals.ts.
  void _client
  if (!process.env.DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set")
  }
  return { customersInserted: 0, notesInserted: 0 }
}
