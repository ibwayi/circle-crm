import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="p-6 md:p-8">
      <p className="text-sm text-muted-foreground">Signed in as</p>
      <p className="text-lg font-medium">{user.email}</p>
    </div>
  )
}
