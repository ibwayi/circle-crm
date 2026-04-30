"use client"

import { useState } from "react"

import { DeleteDealDialog } from "@/components/deals/delete-deal-dialog"
import { EditDealDialog } from "@/components/deals/edit-deal-dialog"
import type { ContactOption } from "@/components/shared/contact-combobox"
import { Button } from "@/components/ui/button"
import type { Deal } from "@/lib/db/deals"

export function DealDetailActions({
  deal,
  companies,
  contacts,
}: {
  deal: Deal
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
}) {
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
      <EditDealDialog
        deal={deal}
        companies={companies}
        contacts={contacts}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteDealDialog
        deal={{ id: deal.id, title: deal.title }}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
