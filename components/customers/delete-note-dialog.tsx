"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteNoteAction } from "@/app/(app)/customers/actions"
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
import { cn } from "@/lib/utils"

export function DeleteNoteDialog({
  noteId,
  customerId,
  open,
  onOpenChange,
  onDeletePending,
}: {
  noteId: string
  customerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called the moment the user confirms the delete (before the action
   * resolves). Used by the parent to fade the note out optimistically; the
   * fade is reverted via `onDeleteError` if the action fails.
   */
  onDeletePending?: () => void
  /**
   * Cancel-style hook: if the action fails, the parent should restore the
   * pre-fade UI. Optional — if omitted, only the toast surfaces the error.
   */
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    onDeletePending?.()
    const result = await deleteNoteAction(noteId, customerId)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      // Note stays visible; the parent's fade is reset by re-rendering on
      // refresh below.
      startTransition(() => router.refresh())
      return
    }

    toast.success("Note deleted")
    onOpenChange(false)
    startTransition(() => router.refresh())
  }

  const busy = submitting || pending

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={busy}
            className={cn(
              buttonVariants({ variant: "destructive" }),
              "min-w-[100px]"
            )}
          >
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
