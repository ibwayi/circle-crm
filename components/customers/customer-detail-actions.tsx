"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog"
import type { Customer } from "@/lib/db/customers"

// Hosts the per-customer dialog state for the detail page. Delete is wired
// in the next ticket (T-6.3).
export function CustomerDetailActions({ customer }: { customer: Customer }) {
  const [editOpen, setEditOpen] = useState(false)

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
          disabled
          title="Coming next"
        >
          Delete
        </Button>
      </div>
      <EditCustomerDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
