"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  deleteNoteAction,
  type NotesTarget,
} from "@/app/(app)/_actions/notes"
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
  target,
  open,
  onOpenChange,
  onDeletePending,
}: {
  noteId: string
  target: NotesTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeletePending?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    onDeletePending?.()
    const result = await deleteNoteAction(noteId, target)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
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
