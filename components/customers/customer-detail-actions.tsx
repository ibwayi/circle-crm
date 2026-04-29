"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DeleteCustomerDialog } from "@/components/customers/delete-customer-dialog"
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog"
import type { Customer } from "@/lib/db/customers"

// Hosts the per-customer dialog state for the detail page. Edit is in-page;
// Delete navigates back to the list once the action succeeds.
export function CustomerDetailActions({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>
      <EditCustomerDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCustomerDialog
        customer={customer}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/customers")}
      />
    </>
  )
}
