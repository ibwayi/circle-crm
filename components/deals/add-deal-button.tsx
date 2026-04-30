"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { AddDealDialog } from "@/components/deals/add-deal-dialog"
import type { ContactOption } from "@/components/shared/contact-combobox"
import { Button } from "@/components/ui/button"

export function AddDealButton({
  companies,
  contacts,
  variant = "default",
  size = "default",
  label = "Add deal",
}: {
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
  variant?: "default" | "outline"
  size?: "default" | "sm"
  label?: string
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
        {label}
      </Button>
      <AddDealDialog
        open={open}
        onOpenChange={setOpen}
        companies={companies}
        contacts={contacts}
      />
    </>
  )
}
