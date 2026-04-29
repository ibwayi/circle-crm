import Link from "next/link"
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

  // Pipeline subtext branches on whether the user has any customers at all
  // vs. customers without value_eur set.
  let pipelineSubtext: string
  if (stats.total === 0) {
    pipelineSubtext = "Add your first customer to start tracking pipeline."
  } else if (stats.pipelineValueEur === 0) {
    pipelineSubtext = "Add value to your customers to track pipeline."
  } else {
    pipelineSubtext = `Across ${activeDeals} active ${activeDeals === 1 ? "deal" : "deals"}.`
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Dashboard</h2>
        </div>
        <AddCustomerButton />
      </header>

      <section
        aria-label="Pipeline summary"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <StatCard
          label="Total customers"
          value={stats.total}
          href="/customers"
        />
        <StatCard
          label="Leads"
          value={stats.leads}
          accent="lead"
          href="/customers?status=lead"
        />
        <StatCard
          label="Customers"
          value={stats.customers}
          accent="customer"
          href="/customers?status=customer"
        />
        <StatCard
          label="Closed deals"
          value={stats.closed}
          accent="closed"
          href="/customers?status=closed"
        />
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
          <p className="text-sm text-muted-foreground">{pipelineSubtext}</p>
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
  href,
}: {
  label: string
  value: number
  accent?: "lead" | "customer" | "closed"
  href: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        className={cn(
          accent && ACCENT_CLASS[accent],
          "h-full transition-colors hover:bg-muted/50"
        )}
      >
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums">
            {value}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  )
}
