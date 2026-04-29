"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteCustomerAction } from "@/app/(app)/customers/actions"
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
import type { Customer } from "@/lib/db/customers"
import { cn } from "@/lib/utils"

export function DeleteCustomerDialog({
  customer,
  open,
  onOpenChange,
  onDeleted,
}: {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called after a successful delete. Use this to navigate (e.g. detail page
   * → list) when you don't want to rely solely on revalidatePath.
   */
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    const result = await deleteCustomerAction(customer.id)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    toast.success("Customer deleted")
    onOpenChange(false)
    startTransition(() => {
      router.refresh()
    })
    onDeleted?.()
  }

  const busy = submitting || pending

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete customer?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <strong className="text-foreground">{customer.name}</strong> and
            all associated notes. This action cannot be undone.
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
