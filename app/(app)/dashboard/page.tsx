import { redirect } from "next/navigation"

import { AddCustomerButton } from "@/components/customers/add-customer-button"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getCustomerStats,
  listRecentlyUpdated,
} from "@/lib/db/customers"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

// Tailwind needs the full class names at build time — no string templating.
const ACCENT_CLASS: Record<"lead" | "customer" | "closed", string> = {
  lead: "border-t-2 border-t-status-lead",
  customer: "border-t-2 border-t-status-customer",
  closed: "border-t-2 border-t-status-closed",
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [stats, recent] = await Promise.all([
    getCustomerStats(supabase),
    listRecentlyUpdated(supabase, 5),
  ])
  const activeDeals = stats.leads + stats.customers

  return (
    <div className="space-y-8 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user.email}
          </p>
        </div>
        <AddCustomerButton />
      </header>

      <section
        aria-label="Pipeline summary"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <StatCard label="Total customers" value={stats.total} />
        <StatCard label="Leads" value={stats.leads} accent="lead" />
        <StatCard label="Customers" value={stats.customers} accent="customer" />
        <StatCard label="Closed deals" value={stats.closed} accent="closed" />
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Pipeline value</CardDescription>
          {stats.pipelineValueEur === 0 ? (
            <CardTitle className="text-3xl font-medium tabular-nums text-muted-foreground">
              —
            </CardTitle>
          ) : (
            <CardTitle className="text-3xl font-medium tabular-nums">
              {eurFormatter.format(stats.pipelineValueEur)}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {stats.pipelineValueEur === 0
              ? "Add value to your customers to track pipeline."
              : `Across ${activeDeals} active ${activeDeals === 1 ? "deal" : "deals"}.`}
          </p>
        </CardContent>
      </Card>

      <RecentActivity customers={recent} />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: "lead" | "customer" | "closed"
}) {
  return (
    <Card className={cn(accent && ACCENT_CLASS[accent])}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-medium tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
