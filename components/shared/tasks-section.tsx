"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { AddTaskDialog } from "@/components/tasks/add-task-dialog"
import type { PipelineDealOption } from "@/components/tasks/pipeline-picker-modal"
import type {
  TaskContext,
  TaskParentOption,
} from "@/components/tasks/task-form"
import { TaskRow } from "@/components/tasks/task-row"
import { Button } from "@/components/ui/button"
import type { Task, TaskDealContext, TaskParent } from "@/lib/db/tasks"

/**
 * Polymorphic-target shape for the section. Phase 24.7 collapsed to
 * Deal-or-Standalone for parent FKs, but the Section is also mounted
 * read-only on Contact / Company detail pages to surface tasks
 * transitively. The "transitive" arms carry the entity id only for
 * the heading copy — the task list itself is pre-built by the page
 * via lib/db/tasks.listTasksFor{Company,Contact}Transitive.
 */
export type TasksTarget =
  | { type: "deal"; dealId: string }
  | { type: "transitive-company"; companyId: string }
  | { type: "transitive-contact"; contactId: string }

function targetToParent(target: TasksTarget): TaskParent | null {
  // Only the deal target maps to a parent the user can attach tasks to;
  // the transitive arms have no creatable parent (read-only views).
  switch (target.type) {
    case "deal":
      return { type: "deal", dealId: target.dealId }
    case "transitive-company":
    case "transitive-contact":
      return null
  }
}

type Props = {
  target: TasksTarget
  initialTasks: Task[]
  // Detail pages forward their entity's neighbours so the Add Task
  // dialog can render a read-only "→ Firma: X — Hauptkontakt: Y" hint
  // without the form having to re-fetch the relations.
  context?: TaskContext
  // Per-deal context map keyed by deal_id, used by the transitive
  // listings to render Firma / Hauptkontakt under each row's parent
  // hint. Pages build it via getTaskDealContexts and pass it down.
  dealContexts?: Map<string, TaskDealContext>
  // Rich deal catalog forwarded into TaskRow → EditTaskDialog so the
  // edit dialog can render real labels in its combobox + Pipeline
  // modal. Without this the dialog falls back to raw "deal:<uuid>"
  // strings (Phase 24.8 Bug 2).
  dealOptions?: PipelineDealOption[]
  // Legacy thin catalog kept for ParentHint label fallback. Pages
  // already passing dealOptions can omit this.
  parentOptions?: TaskParentOption[]
  // Read-only mode — required for transitive targets (Contact /
  // Company), optional for deal targets if the page wants to lock
  // editing for some reason. Hides the Add button + per-row delete +
  // inline reschedule (see TaskRow).
  readOnly?: boolean
  // Custom heading text. Defaults to "Aufgaben"; transitive targets
  // pass "Aufgaben aus Deals" / "Aufgaben aus verknüpften Deals".
  heading?: string
  // Custom empty-state copy. The transitive listings substitute the
  // entity's name into the message.
  emptyMessage?: string
}

export function TasksSection({
  target,
  initialTasks,
  context,
  dealContexts,
  dealOptions,
  parentOptions,
  readOnly = false,
  heading,
  emptyMessage,
}: Props) {
  const [addOpen, setAddOpen] = useState(false)

  const open = initialTasks.filter((t) => t.completed_at === null)
  const done = initialTasks.filter((t) => t.completed_at !== null)
  const countLabel =
    initialTasks.length === 1 ? "1 Aufgabe" : `${initialTasks.length} Aufgaben`

  const fixedParent = targetToParent(target)
  const showAddButton = !readOnly && fixedParent !== null

  // Transitive listings are deal-tasks shown outside their own deal —
  // we want the parent hint so the user knows which deal the task came
  // from. Deal-target listings hide the hint (the parent is the page).
  const showParentHint = target.type !== "deal"

  return (
    <section aria-labelledby="tasks-heading" className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 id="tasks-heading" className="text-base font-medium">
            {heading ?? "Aufgaben"}
          </h3>
          <span className="text-xs text-muted-foreground">{countLabel}</span>
        </div>
        {showAddButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Aufgabe hinzufügen
          </Button>
        )}
      </header>

      {initialTasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage ?? "Noch keine Aufgaben. Füge die erste hinzu, um loszulegen."}
        </p>
      ) : (
        <div className="space-y-2">
          {open.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              showParentHint={showParentHint}
              dealContext={
                task.deal_id ? dealContexts?.get(task.deal_id) ?? null : null
              }
              dealOptions={dealOptions}
              parentOptions={parentOptions}
              readOnly={readOnly}
            />
          ))}
          {done.length > 0 && open.length > 0 && (
            <hr className="my-3 border-border" />
          )}
          {done.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              showParentHint={showParentHint}
              dealContext={
                task.deal_id ? dealContexts?.get(task.deal_id) ?? null : null
              }
              dealOptions={dealOptions}
              parentOptions={parentOptions}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {fixedParent && (
        <AddTaskDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          fixedParent={fixedParent}
          context={context}
          parentOptions={parentOptions}
          dealOptions={dealOptions}
        />
      )}
    </section>
  )
}
