"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CompanyForm } from "@/components/companies/company-form"
import type { Company } from "@/lib/db/companies"

export function EditCompanyDialog({
  company,
  open,
  onOpenChange,
}: {
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit company</DialogTitle>
          <DialogDescription>
            Update {company.name}&apos;s details.
          </DialogDescription>
        </DialogHeader>
        {/* key={company.id} so default values reset cleanly when the
            consumer swaps companies (e.g. row dropdowns later). */}
        <CompanyForm
          key={company.id}
          mode="edit"
          company={company}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
