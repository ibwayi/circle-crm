"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteDealAction } from "@/app/(app)/deals/actions"
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

export function DeleteDealDialog({
  deal,
  open,
  onOpenChange,
}: {
  deal: { id: string; title: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await deleteDealAction(deal.id)
    } catch (e) {
      // Server-action redirect surfaces as a thrown NEXT_REDIRECT — not a
      // real failure. Same special-case as the company/contact dialogs.
      if (e instanceof Error && e.message === "NEXT_REDIRECT") return
      const message = e instanceof Error ? e.message : "Unknown error"
      toast.error("Something went wrong", { description: message })
      setSubmitting(false)
      startTransition(() => router.refresh())
      return
    }
  }

  const busy = submitting || pending

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete deal?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting{" "}
            <strong className="text-foreground">{deal.title}</strong>{" "}
            permanently removes the deal and any notes attached to it. The
            linked company and contacts are not deleted — only their
            connection to this deal. This action cannot be undone.
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
