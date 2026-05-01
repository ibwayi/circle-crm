"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteTaskAction } from "@/app/(app)/_actions/tasks"
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

export function DeleteTaskDialog({
  taskId,
  taskTitle,
  open,
  onOpenChange,
}: {
  taskId: string
  taskTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    const result = await deleteTaskAction(taskId)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Etwas ist schiefgelaufen", { description: result.error })
      return
    }

    toast.success("Aufgabe gelöscht")
    onOpenChange(false)
    startTransition(() => router.refresh())
  }

  const busy = submitting || pending

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground">{taskTitle}</strong> wird
            entfernt. Das kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={busy}
            className={cn(
              buttonVariants({ variant: "destructive" }),
              "min-w-[100px]"
            )}
          >
            {busy ? "Lösche…" : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
