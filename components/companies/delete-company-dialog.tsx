"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteCompanyAction } from "@/app/(app)/companies/actions"
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

export function DeleteCompanyDialog({
  company,
  open,
  onOpenChange,
  contactCount,
  dealCount,
}: {
  company: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Optional counts. If passed, the warning copy mentions specifically how
   * many children will be detached. The schema's ON DELETE SET NULL means
   * those rows survive without a company link — we never cascade-delete
   * contacts or deals here.
   */
  contactCount?: number
  dealCount?: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      // Server action redirects to /companies on success — the await
      // never resolves on the happy path.
      await deleteCompanyAction(company.id)
    } catch (e) {
      // Special-case Next.js redirect "errors": these are how the
      // framework signals navigation from a server action and shouldn't
      // surface to the user as a failure.
      if (e instanceof Error && e.message === "NEXT_REDIRECT") {
        return
      }
      const message = e instanceof Error ? e.message : "Unknown error"
      toast.error("Something went wrong", { description: message })
      setSubmitting(false)
      startTransition(() => router.refresh())
      return
    }
  }

  const busy = submitting || pending

  const detachLine =
    contactCount !== undefined && dealCount !== undefined
      ? `Detach ${pluralize(contactCount, "contact")} and ${pluralize(dealCount, "deal")}`
      : "Detach its contacts and deals"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete company?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting{" "}
            <strong className="text-foreground">{company.name}</strong> will{" "}
            {detachLine.toLowerCase()} — they&apos;ll survive without a
            company link. This action cannot be undone.
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
