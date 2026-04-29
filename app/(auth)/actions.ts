"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Result shape only carries errors. On success the action redirects via
// next/navigation, which throws and never returns.
export type DemoLoginResult = { error: string }

export async function signInAsDemoAction(): Promise<DemoLoginResult> {
  const email = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD

  if (!email || !password) {
    // Don't reveal which one is missing — both are sensitive config.
    return { error: "Demo isn't configured. Please try again later." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Log the upstream message server-side for debugging, but return a
    // sanitized, password-free message to the client. Even if Supabase ever
    // echoed credentials back in error messages (it doesn't), our return
    // value cannot leak them.
    console.error("Demo login failed:", error.message)
    return { error: "Couldn't sign in to the demo account." }
  }

  redirect("/dashboard")
}
