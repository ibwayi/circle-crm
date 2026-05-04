"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, CircleDot, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  bulkDeleteTasksAction,
  bulkSetTasksStatusAction,
} from "@/app/(app)/_actions/tasks"
import { BulkActionBar } from "@/components/shared/bulk-action-bar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import type { Task, TaskStatus } from "@/lib/db/tasks"
import { cn } from "@/lib/utils"

/**
 * Bulk-action surface for /tasks. Status-aware in Phase 29.5 — three
 * status buttons (Erledigen / In Bearbeitung / Wieder öffnen) plus
 * Löschen. Each status button is disabled when every selected task
 * is already in that target state, since pressing it would be a no-op
 * — gives the user clear feedback about which transitions are
 * meaningful for the current selection.
 */
export function TaskBulkActions({
  selectedIds,
  visibleTasks,
  onClear,
}: {
  selectedIds: ReadonlySet<string>
  visibleTasks: Task[]
  onClear: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ids = Array.from(selectedIds)
  const count = ids.length

  // Per-status counts of the current selection. A button is disabled
  // when its target equals the universal current state — pressing
  // would change nothing.
  const selected = visibleTasks.filter((t) => selectedIds.has(t.id))
  const counts = {
    open: selected.filter((t) => t.status === "open").length,
    in_progress: selected.filter((t) => t.status === "in_progress").length,
    completed: selected.filter((t) => t.status === "completed").length,
  }
  const total = selected.length

  async function handleSetStatus(status: TaskStatus): Promise<void> {
    setBusy(true)
    const result = await bulkSetTasksStatusAction(ids, status)
    setBusy(false)
    if (!result.ok) {
      toast.error("Konnte nicht aktualisieren", { description: result.error })
      return
    }
    const verb =
      status === "completed"
        ? "erledigt"
        : status === "in_progress"
          ? "in Bearbeitung"
          : "wieder geöffnet"
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Aufgabe" : "Aufgaben"} ${verb}`
    )
    onClear()
    startTransition(() => router.refresh())
  }

  async function handleDeleteConfirm(): Promise<void> {
    setBusy(true)
    const result = await bulkDeleteTasksAction(ids)
    setBusy(false)
    setConfirmDeleteOpen(false)
    if (!result.ok) {
      toast.error("Konnte nicht löschen", { description: result.error })
      return
    }
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Aufgabe" : "Aufgaben"} gelöscht`
    )
    onClear()
    startTransition(() => router.refresh())
  }

  return (
    <>
      <BulkActionBar
        selectedCount={count}
        onClear={onClear}
        actions={[
          {
            id: "complete",
            label: "Erledigen",
            icon: CheckCircle2,
            disabled: busy || counts.completed === total,
            onClick: () => handleSetStatus("completed"),
          },
          {
            id: "in-progress",
            label: "In Bearbeitung",
            icon: CircleDot,
            disabled: busy || counts.in_progress === total,
            onClick: () => handleSetStatus("in_progress"),
          },
          {
            id: "reopen",
            label: "Wieder öffnen",
            icon: RotateCcw,
            disabled: busy || counts.open === total,
            onClick: () => handleSetStatus("open"),
          },
          {
            id: "delete",
            label: "Löschen",
            icon: Trash2,
            variant: "destructive",
            disabled: busy,
            onClick: () => setConfirmDeleteOpen(true),
          },
        ]}
      />
      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {count} {count === 1 ? "Aufgabe" : "Aufgaben"} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die Aufgaben werden dauerhaft entfernt. Das kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteConfirm()
              }}
              disabled={busy}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "min-w-[100px]"
              )}
            >
              {busy ? "Lösche…" : `${count} löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
