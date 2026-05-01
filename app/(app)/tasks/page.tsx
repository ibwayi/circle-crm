import { ListTodo } from "lucide-react"

import { AddTaskButton } from "@/components/tasks/add-task-button"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { TaskRow } from "@/components/tasks/task-row"
import { TasksTabs, type TasksTab } from "@/components/tasks/tasks-tabs"
import { listCompanies } from "@/lib/db/companies"
import { listContacts } from "@/lib/db/contacts"
import { listDeals } from "@/lib/db/deals"
import {
  getTaskStats,
  listCompletedTasks,
  listOverdueTasks,
  listTasksDueToday,
  listUpcomingTasks,
  type Task,
} from "@/lib/db/tasks"
import { createClient } from "@/lib/supabase/server"

const VALID_TABS: readonly TasksTab[] = [
  "today",
  "overdue",
  "upcoming",
  "completed",
]

function parseTab(raw: string | undefined): TasksTab {
  if (raw && (VALID_TABS as readonly string[]).includes(raw)) {
    return raw as TasksTab
  }
  return "today"
}

const EMPTY_LABEL: Record<TasksTab, string> = {
  today: "Keine Aufgaben für heute.",
  overdue: "Nichts überfällig 🎉",
  upcoming: "Keine kommenden Aufgaben.",
  completed: "Noch keine erledigten Aufgaben.",
}

function buildParentOptions(
  deals: { id: string; title: string }[],
  contacts: { id: string; first_name: string; last_name: string | null }[],
  companies: { id: string; name: string }[]
): TaskParentOption[] {
  const options: TaskParentOption[] = []
  for (const d of deals) {
    options.push({
      value: `deal:${d.id}`,
      label: `Deal: ${d.title}`,
      parent: { type: "deal", dealId: d.id },
    })
  }
  for (const c of contacts) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ")
    options.push({
      value: `contact:${c.id}`,
      label: `Kontakt: ${name}`,
      parent: { type: "contact", contactId: c.id },
    })
  }
  for (const co of companies) {
    options.push({
      value: `company:${co.id}`,
      label: `Firma: ${co.name}`,
      parent: { type: "company", companyId: co.id },
    })
  }
  return options
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const activeTab = parseTab(params.tab)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Layout-level guard already redirected unauthenticated users; the
  // optional-chain is defensive.
  const userId = user?.id ?? ""

  // The page needs:
  //   * The active tab's task list
  //   * Stats for all four tab counters
  //   * Parent-options catalog for the Add Task / Edit Task pickers
  // Run them in parallel so the page renders in one round-trip.
  const [tasks, stats, deals, contacts, companies] = await Promise.all([
    fetchTabTasks(supabase, activeTab),
    getTaskStats(supabase, userId),
    listDeals(supabase),
    listContacts(supabase),
    listCompanies(supabase),
  ])

  const parentOptions = buildParentOptions(
    deals.map((d) => ({ id: d.id, title: d.title })),
    contacts.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })),
    companies.map((co) => ({ id: co.id, name: co.name }))
  )

  const counts = {
    today: stats.dueToday,
    overdue: stats.overdue,
    upcoming: stats.upcoming,
    completed: stats.completed,
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Aufgaben</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Was als nächstes ansteht.
          </p>
        </div>
        <AddTaskButton parentOptions={parentOptions} />
      </header>

      <TasksTabs initial={activeTab} counts={counts} />

      {tasks.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center rounded-lg border border-dashed border-border bg-card">
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ListTodo
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {EMPTY_LABEL[activeTab]}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              parentOptions={parentOptions}
              showParentHint
            />
          ))}
        </div>
      )}
    </div>
  )
}

async function fetchTabTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tab: TasksTab
): Promise<Task[]> {
  switch (tab) {
    case "today":
      return listTasksDueToday(supabase)
    case "overdue":
      return listOverdueTasks(supabase)
    case "upcoming":
      return listUpcomingTasks(supabase)
    case "completed":
      return listCompletedTasks(supabase)
  }
}
