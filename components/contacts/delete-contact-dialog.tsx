"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteContactAction } from "@/app/(app)/contacts/actions"
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

function pluralize(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? "" : "s"}`
}

export function DeleteContactDialog({
  contact,
  open,
  onOpenChange,
  dealCount,
}: {
  contact: { id: string; first_name: string; last_name: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Optional count of linked deals. When passed, the warning copy mentions
   * the exact number. The deals themselves are NEVER cascade-deleted —
   * only the deal_contacts junction rows go away.
   */
  dealCount?: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const fullName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ")

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await deleteContactAction(contact.id)
    } catch (e) {
      // Next signals server-action redirects via a thrown NEXT_REDIRECT —
      // not a real failure. Same special-case as DeleteCompanyDialog.
      if (e instanceof Error && e.message === "NEXT_REDIRECT") return
      const message = e instanceof Error ? e.message : "Unknown error"
      toast.error("Something went wrong", { description: message })
      setSubmitting(false)
      startTransition(() => router.refresh())
      return
    }
  }

  const busy = submitting || pending

  const dealsLine =
    dealCount !== undefined
      ? `Will remove ${fullName} from ${pluralize(dealCount, "deal")}`
      : `Will remove ${fullName} from any linked deals`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete contact?</AlertDialogTitle>
          <AlertDialogDescription>
            {dealsLine}. The deals themselves are not deleted. This action
            cannot be undone.
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
