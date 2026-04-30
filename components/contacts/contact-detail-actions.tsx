"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DeleteContactDialog } from "@/components/contacts/delete-contact-dialog"
import { EditContactDialog } from "@/components/contacts/edit-contact-dialog"
import type { Contact } from "@/lib/db/contacts"

export function ContactDetailActions({
  contact,
  companies,
  dealCount,
}: {
  contact: Contact
  companies: { id: string; name: string }[]
  dealCount: number
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
      <EditContactDialog
        contact={contact}
        companies={companies}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteContactDialog
        contact={contact}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        dealCount={dealCount}
      />
    </>
  )
}
