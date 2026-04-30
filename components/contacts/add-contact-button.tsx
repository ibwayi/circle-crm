"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddContactDialog } from "@/components/contacts/add-contact-dialog"

export function AddContactButton({
  companies,
  variant = "default",
  size = "default",
}: {
  companies: { id: string; name: string }[]
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Contact
      </Button>
      <AddContactDialog
        open={open}
        onOpenChange={setOpen}
        companies={companies}
      />
    </>
  )
}
