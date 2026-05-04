"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddContactDialog } from "@/components/contacts/add-contact-dialog"
import { useAutoOpenFromQuery } from "@/lib/hooks/use-auto-open-from-query"

export function AddContactButton({
  companies,
  variant = "default",
  size = "default",
}: {
  companies: { id: string; name: string }[]
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
}) {
  // See lib/hooks/use-auto-open-from-query — Cmd+K wires
  // /contacts?new=true here for cross-route AND same-route nav.
  const { open, setOpen } = useAutoOpenFromQuery("new")

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
