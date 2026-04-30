"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { updateDealStage, type DealStage } from "@/lib/db/deals"

const dealStageSchema: z.ZodType<DealStage> = z.enum([
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
])

export type DealActionResult =
  | { ok: true; dealId: string }
  | { ok: false; error: string }

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

export async function updateDealStageAction(
  id: string,
  stage: DealStage
): Promise<DealActionResult> {
  // Validate at the boundary — clients can pass anything via a server action
  // call, and the DB CHECK would reject but as a less friendly Postgres error.
  const parsed = dealStageSchema.safeParse(stage)
  if (!parsed.success) {
    return { ok: false, error: "Invalid stage value." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const deal = await updateDealStage(supabase, id, parsed.data)
    revalidatePath("/deals")
    revalidatePath(`/deals/${id}`)
    revalidatePath("/dashboard")
    return { ok: true, dealId: deal.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
