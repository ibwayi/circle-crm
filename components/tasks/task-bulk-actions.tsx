"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  bulkCompleteTasksAction,
  bulkDeleteTasksAction,
  bulkUncompleteTasksAction,
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
import type { Task } from "@/lib/db/tasks"
import { cn } from "@/lib/utils"

/**
 * Bulk-action surface for /tasks. The action set varies by tab:
 *   * Today / Overdue / Upcoming → Erledigen + Löschen (open tasks)
 *   * Completed → Wieder öffnen + Löschen (already-done tasks)
 *
 * In practice we just show all three buttons because a tab can mix
 * states once the user starts toggling complete on individual rows.
 * The BulkActionBar handles its own count chip and clear-X.
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

  // Decide which "complete" verb to offer: if the majority of the
  // selection is already complete, "Wieder öffnen" makes more sense
  // than "Erledigen". Both buttons stay available so power users can
  // pick either explicitly.
  const selected = visibleTasks.filter((t) => selectedIds.has(t.id))
  const completedCount = selected.filter((t) => t.completed_at !== null).length
  const openCount = selected.length - completedCount

  async function handleComplete(): Promise<void> {
    setBusy(true)
    const result = await bulkCompleteTasksAction(ids)
    setBusy(false)
    if (!result.ok) {
      toast.error("Konnte nicht erledigen", { description: result.error })
      return
    }
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Aufgabe" : "Aufgaben"} erledigt`
    )
    onClear()
    startTransition(() => router.refresh())
  }

  async function handleUncomplete(): Promise<void> {
    setBusy(true)
    const result = await bulkUncompleteTasksAction(ids)
    setBusy(false)
    if (!result.ok) {
      toast.error("Konnte nicht öffnen", { description: result.error })
      return
    }
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Aufgabe" : "Aufgaben"} wieder geöffnet`
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
            disabled: busy || openCount === 0,
            onClick: handleComplete,
          },
          {
            id: "uncomplete",
            label: "Wieder öffnen",
            icon: RotateCcw,
            disabled: busy || completedCount === 0,
            onClick: handleUncomplete,
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
