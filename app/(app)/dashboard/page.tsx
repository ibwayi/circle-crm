import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const STAT_CARDS = [
  { key: "total", label: "Total" },
  { key: "leads", label: "Leads" },
  { key: "customers", label: "Customers" },
  { key: "closed", label: "Closed" },
] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header>
        <h2 className="text-2xl font-medium tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </header>

      <section
        aria-label="Pipeline summary"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl font-medium tabular-nums">
                —
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Real numbers in Phase 9
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
