import { ListTodo } from "lucide-react"

import type { PipelineDealOption } from "@/components/tasks/pipeline-picker-modal"
import { AddTaskButton } from "@/components/tasks/add-task-button"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { TasksList } from "@/components/tasks/tasks-list"
import { TasksTabs, type TasksTab } from "@/components/tasks/tasks-tabs"
import { listDeals, type DealWithRelations } from "@/lib/db/deals"
import type { DealStage } from "@/components/deals/stage-badge"
import {
  getTaskDealContexts,
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
  deals: { id: string; title: string }[]
): TaskParentOption[] {
  // Phase 24.7: only Deal options remain. Standalone is the implicit
  // sentinel rendered separately by TaskForm. Phase 24.8: kept as a
  // ParentHint label-fallback resolver — the rich combobox + modal use
  // PipelineDealOption[] instead.
  return deals.map((d) => ({
    value: `deal:${d.id}`,
    label: `Deal: ${d.title}`,
    parent: { type: "deal", dealId: d.id },
  }))
}

// Convert listDeals's flat shape into the rich option used by the
// combobox + Pipeline modal. Centralised here so /tasks, /dashboard,
// and the three detail pages all build the catalog the same way.
function buildDealOptions(deals: DealWithRelations[]): PipelineDealOption[] {
  return deals.map((d) => {
    const primaryContactName = d.primary_contact
      ? [d.primary_contact.first_name, d.primary_contact.last_name]
          .filter(Boolean)
          .join(" ")
      : null
    return {
      id: d.id,
      title: d.title,
      companyName: d.company?.name ?? null,
      stage: d.stage as DealStage,
      primaryContactName,
      valueEur: d.value_eur,
    }
  })
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const activeTab = parseTab(params.tab)
  // Cmd+K's `?new=true` is consumed client-side by AddTaskButton via
  // useAutoOpenFromQuery.

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
  const [tasks, stats, deals] = await Promise.all([
    fetchTabTasks(supabase, activeTab),
    getTaskStats(supabase, userId),
    listDeals(supabase),
  ])

  // Per-deal transitive context (Firma + Hauptkontakt) for every
  // deal-task currently shown. Built from this tab's task set so we
  // don't pay for deals the user can't see right now.
  const visibleDealIds = tasks
    .map((t) => t.deal_id)
    .filter((id): id is string => id !== null)
  const dealContexts = await getTaskDealContexts(supabase, visibleDealIds)

  const parentOptions = buildParentOptions(
    deals.map((d) => ({ id: d.id, title: d.title }))
  )
  const dealOptions = buildDealOptions(deals)

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
        <AddTaskButton
          parentOptions={parentOptions}
          dealOptions={dealOptions}
        />
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
        <TasksList
          tasks={tasks}
          parentOptions={parentOptions}
          dealOptions={dealOptions}
          dealContexts={dealContexts}
        />
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
