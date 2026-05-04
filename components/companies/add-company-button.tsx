"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddCompanyDialog } from "@/components/companies/add-company-dialog"
import { useAutoOpenFromQuery } from "@/lib/hooks/use-auto-open-from-query"

export function AddCompanyButton({
  variant = "default",
  size = "default",
}: {
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
}) {
  // See lib/hooks/use-auto-open-from-query — Cmd+K wires
  // /companies?new=true here for cross-route AND same-route nav.
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
        Add Company
      </Button>
      <AddCompanyDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
