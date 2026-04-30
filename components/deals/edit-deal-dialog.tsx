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
import type { Deal } from "@/lib/db/deals"

export function EditDealDialog({
  deal,
  companies,
  contacts,
  open,
  onOpenChange,
}: {
  deal: Deal
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit deal</DialogTitle>
          <DialogDescription>
            Update {deal.title}&apos;s details.
          </DialogDescription>
        </DialogHeader>
        <DealForm
          // Reset form state when switching deals.
          key={deal.id}
          mode="edit"
          deal={deal}
          companies={companies}
          contacts={contacts}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
