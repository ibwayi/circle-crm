import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import { seedDemoData } from "@/lib/seed/demo-data"
import type { Database } from "@/types/database"

// Force-dynamic so the route handler runs on every request — caching the
// reset would defeat the cron's purpose.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Vercel Cron attaches `Authorization: Bearer <CRON_SECRET>` automatically
  // when CRON_SECRET is set in env. We reject anything that doesn't match —
  // including direct GETs to the URL without the header. See vercel.json.
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Server not configured" },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase env missing" },
      { status: 500 }
    )
  }

  const adminClient = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const result = await seedDemoData(adminClient)
    console.log(
      `Demo reset OK — ${result.companiesInserted} companies, ${result.contactsInserted} contacts, ${result.dealsInserted} deals, ${result.notesInserted} notes.`
    )
    return NextResponse.json({
      ok: true,
      companiesInserted: result.companiesInserted,
      contactsInserted: result.contactsInserted,
      dealsInserted: result.dealsInserted,
      dealContactsInserted: result.dealContactsInserted,
      notesInserted: result.notesInserted,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error("Demo reset failed:", message)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
