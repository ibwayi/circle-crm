import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/shared/sidebar"
import { Topbar } from "@/components/shared/topbar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Defense in depth — proxy already redirects unauthenticated requests,
  // but the layout shouldn't render an empty shell if that ever fails.
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      {/* min-w-0 + overflow-x-clip prevents wide table children from
          blowing out the flex column and shifting the sidebar. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-clip">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
      </div>
    </div>
  )
}
