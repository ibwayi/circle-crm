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

  const email = user.email ?? ""

  return (
    // The sidebar is `fixed` (see components/shared/sidebar.tsx). The
    // content column reserves its space via `md:pl-60` so the topbar +
    // main don't slide under it. Mobile (< md) uses the topbar's Sheet
    // and the sidebar itself is `hidden`, so no offset is needed there.
    <div className="min-h-screen bg-background md:pl-60">
      <Sidebar email={email} />
      {/* min-w-0 + overflow-x-clip prevents wide table children from
          blowing out the column. */}
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip">
        <Topbar email={email} />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
      </div>
    </div>
  )
}
