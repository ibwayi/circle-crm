"use client"

import { useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { toast } from "sonner"

import {
  completeTaskAction,
  rescheduleTaskAction,
  uncompleteTaskAction,
} from "@/app/(app)/_actions/tasks"
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog"
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Task, TaskDealContext } from "@/lib/db/tasks"
import { formatDueDate, type DueTone } from "@/lib/utils/dates"
import { cn } from "@/lib/utils"

const PRIORITY_LABEL: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
}

// Priority palette — low is muted (no need for a color), medium is the
// project's blue (status-lead), high gets the orange "negotiation" tone
// since it's the most urgent end of the spectrum.
const PRIORITY_BADGE_CLASS: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium:
    "bg-status-lead/10 text-status-lead border-status-lead/30 hover:bg-status-lead/15",
  high: "bg-status-negotiation/10 text-status-negotiation border-status-negotiation/30 hover:bg-status-negotiation/15",
}

const DUE_TONE_CLASS: Record<DueTone, string> = {
  today:
    "bg-status-proposal/10 text-status-proposal border-status-proposal/30",
  overdue:
    "bg-destructive/10 text-destructive border-destructive/30",
  upcoming: "bg-muted text-muted-foreground border-border",
  none: "bg-transparent text-muted-foreground border-transparent",
}

export function TaskRow({
  task,
  parentOptions,
  showParentHint,
  dealContext,
  readOnly = false,
}: {
  task: Task
  // Edit dialog needs the catalog of selectable parents (now: each Deal
  // + Standalone). /tasks and the dashboard pass the full catalog;
  // detail-page rows omit it (the implicit parent is the page's entity).
  parentOptions?: TaskParentOption[]
  // Render the parent hint line under the title. /tasks and dashboard
  // set this; detail-page rows leave it off because the parent is
  // already visible above the list.
  showParentHint?: boolean
  // Transitive deal context for this row. When provided AND the task
  // has a deal_id, the hint expands from "→ Deal: X" to a small block
  // with Firma + Hauptkontakt lines beneath. Pages decide whether to
  // pass it (see app/(app)/tasks/page.tsx, dashboard/page.tsx, and the
  // company / contact detail pages).
  dealContext?: TaskDealContext | null
  // Read-only mode for transitive listings (Contact / Company detail
  // pages). Hides the Add-task affordance, the delete button, and the
  // inline-reschedule popover. Checkbox toggle and title-click edit
  // still work — they're the user's only way to act on a task surfaced
  // via transitive context without navigating to its deal.
  readOnly?: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // useOptimistic: checkbox flips completed_at; date popover updates
  // due_date. Both apply instantly and commit in the background; on
  // error the transition ends without the action and the UI snaps back
  // to truth. Discriminated reducer so future row mutations slot in
  // without redoing the wiring.
  type OptimisticAction =
    | { kind: "complete"; completed: boolean }
    | { kind: "reschedule"; due_date: string | null }

  const [optimisticTask, addOptimistic] = useOptimistic(
    task,
    (state, action: OptimisticAction) => {
      switch (action.kind) {
        case "complete":
          return {
            ...state,
            completed_at: action.completed ? new Date().toISOString() : null,
          }
        case "reschedule":
          return { ...state, due_date: action.due_date }
      }
    }
  )

  const isComplete = optimisticTask.completed_at !== null
  const due = formatDueDate(optimisticTask.due_date)
  // Completed tasks dim their due tone — a "today" task that's done
  // shouldn't shout in yellow. The badge stays for context.
  const dueClass = isComplete
    ? DUE_TONE_CLASS.upcoming
    : DUE_TONE_CLASS[due.tone]

  function handleToggle() {
    const willComplete = !isComplete
    startTransition(async () => {
      addOptimistic({ kind: "complete", completed: willComplete })
      const result = willComplete
        ? await completeTaskAction(task.id)
        : await uncompleteTaskAction(task.id)
      if (!result.ok) {
        toast.error("Konnte nicht aktualisiert werden", {
          description: result.error,
        })
      }
      router.refresh()
    })
  }

  function handleReschedule(d: Date | null) {
    const iso = d ? format(d, "yyyy-MM-dd") : null
    startTransition(async () => {
      addOptimistic({ kind: "reschedule", due_date: iso })
      const result = await rescheduleTaskAction(task.id, iso)
      if (!result.ok) {
        toast.error("Konnte nicht aktualisiert werden", {
          description: result.error,
        })
      }
      router.refresh()
    })
  }

  function handleTitleClick() {
    setEditOpen(true)
  }

  return (
    <>
      <article
        className={cn(
          "group flex items-start gap-3 rounded-md border border-border bg-card p-3 transition-opacity",
          isComplete && "opacity-60"
        )}
      >
        <input
          type="checkbox"
          checked={isComplete}
          onChange={handleToggle}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border border-input accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={isComplete ? "Als offen markieren" : "Als erledigt markieren"}
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handleTitleClick}
            className={cn(
              "text-left text-sm font-medium underline-offset-4 transition-colors hover:underline",
              isComplete && "line-through"
            )}
          >
            {optimisticTask.title}
          </button>
          {optimisticTask.notes && (
            <p
              className={cn(
                "mt-0.5 line-clamp-2 text-xs text-muted-foreground",
                isComplete && "line-through"
              )}
            >
              {optimisticTask.notes}
            </p>
          )}
          {showParentHint && (
            <ParentHint
              task={optimisticTask}
              parentOptions={parentOptions}
              dealContext={dealContext}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 px-1.5 py-0 text-[10px] uppercase tracking-wide",
              PRIORITY_BADGE_CLASS[optimisticTask.priority] ?? PRIORITY_BADGE_CLASS.medium
            )}
          >
            {PRIORITY_LABEL[optimisticTask.priority] ?? optimisticTask.priority}
          </Badge>
          {isComplete || readOnly ? (
            // Completed tasks AND read-only rows render the date as a
            // plain badge. Rescheduling a done task isn't a coherent
            // action; rescheduling a transitive (read-only) task should
            // happen on the deal's own page.
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[11px]", dueClass)}
            >
              {due.label}
            </Badge>
          ) : (
            <Popover>
              <PopoverTrigger
                type="button"
                aria-label="Fälligkeit ändern"
                className={cn(
                  "shrink-0 cursor-pointer rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                  "hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  dueClass
                )}
              >
                {due.label}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  locale={de}
                  selected={
                    optimisticTask.due_date
                      ? new Date(optimisticTask.due_date)
                      : undefined
                  }
                  defaultMonth={
                    optimisticTask.due_date
                      ? new Date(optimisticTask.due_date)
                      : new Date()
                  }
                  onSelect={(d) => {
                    handleReschedule(d ?? null)
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              aria-label="Aufgabe löschen"
              title="Löschen"
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity",
                "text-muted-foreground hover:bg-muted hover:text-destructive",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              )}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </article>

      <EditTaskDialog
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
        parentOptions={parentOptions}
      />
      {!readOnly && (
        <DeleteTaskDialog
          taskId={task.id}
          taskTitle={task.title}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </>
  )
}

function ParentHint({
  task,
  parentOptions,
  dealContext,
}: {
  task: Task
  parentOptions?: TaskParentOption[]
  dealContext?: TaskDealContext | null
}) {
  // Standalone task — render an italic hint so the row visually parallels
  // its deal-attached siblings on /tasks and the dashboard.
  if (!task.deal_id) {
    return (
      <p className="mt-1 text-[11px] italic text-muted-foreground">
        Persönliche Aufgabe
      </p>
    )
  }

  // Resolve the deal title in this preference order: the rich
  // `dealContext` (best — also gives us linkability + transitive lines),
  // then the parentOptions catalog (label only), then a generic fallback.
  const opt = parentOptions?.find((o) => o.value === `deal:${task.deal_id}`)
  const dealTitle =
    dealContext?.dealTitle ?? opt?.label?.replace(/^Deal:\s*/, "") ?? null

  return (
    <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
      <p>
        →{" "}
        <Link
          href={`/deals/${task.deal_id}`}
          className="text-foreground underline-offset-4 hover:underline"
        >
          {dealTitle ? `Deal: ${dealTitle}` : "Deal"}
        </Link>
      </p>
      {dealContext?.companyName && (
        <p>
          Firma:{" "}
          {dealContext.companyId ? (
            <Link
              href={`/companies/${dealContext.companyId}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {dealContext.companyName}
            </Link>
          ) : (
            <span className="text-foreground">{dealContext.companyName}</span>
          )}
        </p>
      )}
      {dealContext?.primaryContactName && (
        <p>
          Hauptkontakt:{" "}
          {dealContext.primaryContactId ? (
            <Link
              href={`/contacts/${dealContext.primaryContactId}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {dealContext.primaryContactName}
            </Link>
          ) : (
            <span className="text-foreground">
              {dealContext.primaryContactName}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
