"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddCompanyDialog } from "@/components/companies/add-company-dialog"

export function AddCompanyButton({
  variant = "default",
  size = "default",
}: {
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
        Add Company
      </Button>
      <AddCompanyDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
