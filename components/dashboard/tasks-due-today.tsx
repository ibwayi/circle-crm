"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { TaskRow } from "@/components/tasks/task-row"
import type { TaskParentOption } from "@/components/tasks/task-form"
import type { Task, TaskDealContext } from "@/lib/db/tasks"

const MAX_TODAY = 5
const MAX_OVERDUE = 5

export function DashboardTasksDueToday({
  today,
  overdue,
  parentOptions,
  dealContexts,
}: {
  today: Task[]
  overdue: Task[]
  parentOptions: TaskParentOption[]
  dealContexts: Map<string, TaskDealContext>
}) {
  // Hide the whole section when there's nothing actionable. Recruiters
  // shouldn't land on a dashboard scolding them about an empty queue.
  if (today.length === 0 && overdue.length === 0) {
    return null
  }

  const overdueShown = overdue.slice(0, MAX_OVERDUE)
  const todayShown = today.slice(0, MAX_TODAY)
  const overdueExtra = overdue.length - overdueShown.length
  const todayExtra = today.length - todayShown.length

  return (
    <section aria-labelledby="tasks-due-heading" className="space-y-3">
      <header className="flex items-baseline justify-between gap-2">
        <h3 id="tasks-due-heading" className="text-base font-medium">
          Aufgaben heute{" "}
          <span className="text-xs text-muted-foreground">
            ({today.length})
          </span>
        </h3>
        <Link
          href="/tasks?tab=today"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Alle ansehen →
        </Link>
      </header>

      {overdue.length > 0 && (
        <Link
          href="/tasks?tab=overdue"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p className="text-sm text-destructive">
            <strong>{overdue.length} überfällig</strong> — älteste seit{" "}
            {/* The list is already sorted by due_date ASC, so the first
                entry is the most overdue. */}
            {firstDueDateLabel(overdue)}
          </p>
        </Link>
      )}

      {todayShown.length > 0 && (
        <div className="space-y-2">
          {todayShown.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              parentOptions={parentOptions}
              showParentHint
              dealContext={
                task.deal_id ? dealContexts.get(task.deal_id) ?? null : null
              }
            />
          ))}
          {todayExtra > 0 && (
            <Link
              href="/tasks?tab=today"
              className="block rounded-md border border-dashed border-border bg-card px-4 py-2 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/30"
            >
              + {todayExtra} weitere für heute
            </Link>
          )}
        </div>
      )}

      {overdueExtra > 0 && (
        <Link
          href="/tasks?tab=overdue"
          className="block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          + {overdueExtra} weitere überfällig
        </Link>
      )}
    </section>
  )
}

function firstDueDateLabel(tasks: Task[]): string {
  const first = tasks[0]
  return first?.due_date ?? "—"
}
