"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddContactDialog } from "@/components/contacts/add-contact-dialog"

export function AddContactButton({
  companies,
  variant = "default",
  size = "default",
  initialOpen = false,
}: {
  companies: { id: string; name: string }[]
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
  // Phase 26.5: Cmd+K wires "Neuen Kontakt anlegen" to /contacts?new=true.
  // Page forwards as initialOpen; mount effect strips the param via
  // history.replaceState so a reload doesn't re-open the dialog.
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)

  useEffect(() => {
    if (!initialOpen) return
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.delete("new")
    window.history.replaceState(null, "", url.toString())
  }, [initialOpen])

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
