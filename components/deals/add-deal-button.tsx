"use client"

import { Plus } from "lucide-react"

import { AddDealDialog } from "@/components/deals/add-deal-dialog"
import type { ContactOption } from "@/components/shared/contact-combobox"
import { Button } from "@/components/ui/button"
import { useAutoOpenFromQuery } from "@/lib/hooks/use-auto-open-from-query"

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
  // Cmd+K's "Neuen Deal anlegen" lands here with ?new=true. The hook
  // both initialises open from the URL (cross-route nav) AND watches
  // for same-route changes (already on /deals → Cmd+K → URL flips to
  // /deals?new=true → dialog opens). See lib/hooks/use-auto-open-from-query
  // for the URL-strip mechanics and the React 19 lint exception.
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
