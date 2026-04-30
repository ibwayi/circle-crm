"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ContactForm } from "@/components/contacts/contact-form"

export function AddContactDialog({
  open,
  onOpenChange,
  companies,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: { id: string; name: string }[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>
            Add a person to your network. Optionally link them to a company.
          </DialogDescription>
        </DialogHeader>
        <ContactForm
          mode="create"
          companies={companies}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
