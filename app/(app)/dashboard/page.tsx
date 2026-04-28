import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { signOut } from "./actions"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Belt-and-suspenders: the proxy already redirects unauthenticated
  // requests to /login, but Server Components should still verify auth
  // explicitly so a misconfigured matcher can't leak an empty page.
  if (!user) {
    redirect("/login")
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 p-8">
      <div>
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="text-lg font-medium">{user.email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </main>
  )
}
