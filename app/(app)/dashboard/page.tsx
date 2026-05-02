import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { DashboardRecentActivity } from "@/components/dashboard/recent-activity"
import { DashboardTasksDueToday } from "@/components/dashboard/tasks-due-today"
import { AddDealButton } from "@/components/deals/add-deal-button"
import type { ContactOption } from "@/components/shared/contact-combobox"
import type { TaskParentOption } from "@/components/tasks/task-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listCompanies } from "@/lib/db/companies"
import { listContacts } from "@/lib/db/contacts"
import { getDealStats, getRecentDealActivity, listDeals } from "@/lib/db/deals"
import {
  getTaskDealContexts,
  getTaskStats,
  listOverdueTasks,
  listTasksDueToday,
} from "@/lib/db/tasks"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

const eurFormatterCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

// Tailwind needs the full class names at build time — no string templating.
const ACCENT_CLASS: Record<"active" | "tasks" | "won" | "lost", string> = {
  active: "border-t-2 border-t-status-lead",
  tasks: "border-t-2 border-t-status-proposal",
  won: "border-t-2 border-t-status-customer",
  lost: "border-t-2 border-t-status-closed",
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // The dashboard's primary stat block is now deal- AND task-driven. Plus
  // companies / contacts (for the Add Deal combobox) and a separate deal
  // list (for the task picker's parent options). Single Promise.all so
  // the page renders in one round-trip.
  const [
    stats,
    recentDeals,
    companiesFull,
    contactsFull,
    taskStats,
    todayTasks,
    overdueTasks,
    deals,
  ] = await Promise.all([
    getDealStats(supabase),
    getRecentDealActivity(supabase, { limit: 5 }),
    listCompanies(supabase),
    listContacts(supabase),
    getTaskStats(supabase, user.id),
    listTasksDueToday(supabase),
    listOverdueTasks(supabase),
    listDeals(supabase),
  ])

  const companies = companiesFull.map((c) => ({ id: c.id, name: c.name }))
  const contacts: ContactOption[] = contactsFull.map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    position: c.position,
    company_id: c.company_id,
    company_name: c.company?.name ?? null,
  }))

  // Parent-options catalog for the task rows' edit dialog. Phase 24.7:
  // Deal-only — Standalone is the implicit sentinel inside TaskForm.
  const parentOptions: TaskParentOption[] = deals.map((d) => ({
    value: `deal:${d.id}`,
    label: `Deal: ${d.title}`,
    parent: { type: "deal" as const, dealId: d.id },
  }))

  // Per-deal transitive context for the visible task rows so each row
  // can render Firma + Hauptkontakt alongside the deal hint. Limited to
  // the deal_ids in {today, overdue} to keep the query tight.
  const visibleDealIds = [...todayTasks, ...overdueTasks]
    .map((t) => t.deal_id)
    .filter((id): id is string => id !== null)
  const dealContexts = await getTaskDealContexts(supabase, visibleDealIds)

  const pipelineSubtext =
    stats.activeCount === 0
      ? "Add your first deal to start tracking pipeline."
      : stats.activePipelineEur === 0
        ? "Add value to your deals to track pipeline."
        : `Across ${stats.activeCount} active ${stats.activeCount === 1 ? "deal" : "deals"}.`

  return (
    <div className="space-y-8 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline at a glance.
          </p>
        </div>
        <AddDealButton companies={companies} contacts={contacts} />
      </header>

      <section
        aria-label="Pipeline summary"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <StatCard
          label="Active deals"
          value={stats.activeCount}
          accent="active"
          href="/deals"
        />
        <StatCard
          label="Tasks today"
          value={taskStats.dueToday}
          subtext={
            taskStats.overdue > 0
              ? `${taskStats.overdue} überfällig`
              : undefined
          }
          subtextTone={taskStats.overdue > 0 ? "destructive" : "default"}
          accent="tasks"
          href="/tasks?tab=today"
        />
        <StatCard
          label="Won this month"
          value={stats.wonThisMonthCount}
          subtext={
            stats.wonThisMonthEur > 0
              ? eurFormatterCompact.format(stats.wonThisMonthEur)
              : undefined
          }
          accent="won"
          href="/deals?stage=won"
        />
        <StatCard
          label="Lost this month"
          value={stats.lostThisMonthCount}
          subtext={
            stats.lostThisMonthEur > 0
              ? eurFormatterCompact.format(stats.lostThisMonthEur)
              : undefined
          }
          accent="lost"
          href="/deals?stage=lost"
        />
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Pipeline value</CardDescription>
          {stats.activePipelineEur === 0 ? (
            <CardTitle className="text-3xl font-medium tabular-nums text-muted-foreground">
              —
            </CardTitle>
          ) : (
            <CardTitle className="text-3xl font-medium tabular-nums">
              {eurFormatter.format(stats.activePipelineEur)}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{pipelineSubtext}</p>
        </CardContent>
      </Card>

      <DashboardTasksDueToday
        today={todayTasks}
        overdue={overdueTasks}
        parentOptions={parentOptions}
        dealContexts={dealContexts}
      />

      <DashboardRecentActivity deals={recentDeals} />

      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <h3 id="quick-actions-heading" className="text-base font-medium">
          Quick actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/deals"
            className="group flex items-center justify-between rounded-md border border-border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium">View pipeline</p>
              <p className="text-xs text-muted-foreground">
                Table, groups, and kanban views of every deal.
              </p>
            </div>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/contacts"
            className="group flex items-center justify-between rounded-md border border-border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium">Browse contacts</p>
              <p className="text-xs text-muted-foreground">
                People you&apos;re working with, filterable by company.
              </p>
            </div>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  subtext,
  subtextTone = "default",
  accent,
  href,
}: {
  label: string
  value: number
  subtext?: string
  subtextTone?: "default" | "destructive"
  accent?: "active" | "tasks" | "won" | "lost"
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
          {subtext && (
            <p
              className={cn(
                "mt-1 text-xs tabular-nums",
                subtextTone === "destructive"
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {subtext}
            </p>
          )}
        </CardHeader>
      </Card>
    </Link>
  )
}
