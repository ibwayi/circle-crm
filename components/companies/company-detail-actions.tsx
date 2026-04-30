"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DeleteCompanyDialog } from "@/components/companies/delete-company-dialog"
import { EditCompanyDialog } from "@/components/companies/edit-company-dialog"
import type { Company } from "@/lib/db/companies"

// Hosts edit + delete dialog state for the detail page. The delete server
// action redirects to /companies on success — no onDeleted callback needed.
export function CompanyDetailActions({
  company,
  contactCount,
  dealCount,
}: {
  company: Company
  contactCount: number
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
      <EditCompanyDialog
        company={company}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCompanyDialog
        company={company}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        contactCount={contactCount}
        dealCount={dealCount}
      />
    </>
  )
}
