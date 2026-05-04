import { redirect } from "next/navigation"

import { ProfileForm } from "@/components/profile/profile-form"
import { getUserPreferences } from "@/lib/db/user-preferences"
import { createClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const preferences = await getUserPreferences(supabase, user.id)
  const email = user.email ?? ""

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header>
        <h2 className="text-2xl font-medium tracking-tight">Profil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Avatar, Anzeigename und Standardansicht — gilt nur für dein
          Konto.
        </p>
      </header>

      <div className="max-w-2xl">
        <ProfileForm
          userId={user.id}
          email={email}
          preferences={preferences}
        />
      </div>
    </div>
  )
}
