"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CompanyForm } from "@/components/companies/company-form"

export function AddCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Inline-create flow: invoked with the new company so the parent can
  // append it to a local list and auto-select it in a combobox.
  onCreated?: (company: { id: string; name: string }) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add company</DialogTitle>
          <DialogDescription>
            Create a new company. You can link contacts and deals to it
            after.
          </DialogDescription>
        </DialogHeader>
        <CompanyForm
          mode="create"
          onSuccess={(company) => {
            onCreated?.(company)
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
