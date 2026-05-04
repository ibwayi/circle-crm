"use client"

import { useEffect, useState } from "react"
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
  initialOpen = false,
}: {
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
  variant?: "default" | "outline"
  size?: "default" | "sm"
  label?: string
  // Phase 26.5: Cmd+K's "Neuen Deal anlegen" navigates to /deals?new=true,
  // which the page reads server-side and forwards as initialOpen so the
  // dialog appears immediately (no flash of "list, then dialog"). The
  // mount effect strips the param via history.replaceState so a reload
  // doesn't re-trigger.
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)

  useEffect(() => {
    if (!initialOpen) return
    if (typeof window === "undefined") return
    // history.replaceState — not router.replace — to avoid a Next.js
    // re-render that would re-evaluate searchParams and cascade through
    // the page tree. The dialog's open state is owned by useState here
    // and decoupled from the URL after first paint, so the URL just
    // needs cosmetic cleanup.
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
