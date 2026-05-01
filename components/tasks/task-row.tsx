"use client"

import { useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  completeTaskAction,
  uncompleteTaskAction,
} from "@/app/(app)/_actions/tasks"
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog"
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/db/tasks"
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
}: {
  task: Task
  // Edit dialog needs the parent picker catalog when shown from /tasks.
  // Detail-page TasksSection passes nothing — the picker still appears
  // (so users can re-assign tasks to other entities) but lists only
  // the standalone option until parentOptions is provided. Acceptable
  // for the in-context detail-page path; full re-assignment flow lives
  // in the /tasks dialog where the catalog IS passed.
  parentOptions?: TaskParentOption[]
  // /tasks page sets this to render the "→ Deal: X" parent indicator
  // below the title. Detail-page rows omit it (the parent is implicit
  // from the page).
  showParentHint?: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // useOptimistic: clicking the checkbox flips completed_at instantly,
  // the action commits in the background, and on error the transition
  // ends without applying the optimistic action — visual state snaps
  // back to truth. Same idiom the kanban DnD uses for stage changes.
  const [optimisticTask, addOptimistic] = useOptimistic(
    task,
    (state, action: { completed: boolean }) => ({
      ...state,
      completed_at: action.completed ? new Date().toISOString() : null,
    })
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
      addOptimistic({ completed: willComplete })
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
            <ParentHint task={optimisticTask} parentOptions={parentOptions} />
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
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[11px]", dueClass)}
          >
            {due.label}
          </Badge>
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
        </div>
      </article>

      <EditTaskDialog
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
        parentOptions={parentOptions}
      />
      <DeleteTaskDialog
        taskId={task.id}
        taskTitle={task.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}

function ParentHint({
  task,
  parentOptions,
}: {
  task: Task
  parentOptions?: TaskParentOption[]
}) {
  // When the page hands us its parent catalog we can render the full
  // label ("→ Deal: Q3 Roadmap"). Without it, fall back to the type
  // hint alone — useful even on detail pages where the parent is
  // implicit but you might be looking at a sibling task list.
  let key: string | null = null
  let typeLabel = ""
  if (task.deal_id) {
    key = `deal:${task.deal_id}`
    typeLabel = "Deal"
  } else if (task.contact_id) {
    key = `contact:${task.contact_id}`
    typeLabel = "Kontakt"
  } else if (task.company_id) {
    key = `company:${task.company_id}`
    typeLabel = "Firma"
  }

  if (!key) return null

  const opt = parentOptions?.find((o) => o.value === key)
  const label = opt ? `→ ${opt.label}` : `→ ${typeLabel}`
  return (
    <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
  )
}
