"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog"

export function AddCustomerButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Customer
      </Button>
      <AddCustomerDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
