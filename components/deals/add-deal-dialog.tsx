"use client"

import { DealForm } from "@/components/deals/deal-form"
import type { ContactOption } from "@/components/shared/contact-combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function AddDealDialog({
  open,
  onOpenChange,
  companies,
  contacts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add deal</DialogTitle>
          <DialogDescription>
            Track a new opportunity. You can refine company, contacts, and
            notes after it&apos;s created.
          </DialogDescription>
        </DialogHeader>
        <DealForm
          mode="create"
          companies={companies}
          contacts={contacts}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
