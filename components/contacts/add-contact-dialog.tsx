"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ContactForm,
  type ContactSuccessPayload,
} from "@/components/contacts/contact-form"

export function AddContactDialog({
  open,
  onOpenChange,
  companies,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: { id: string; name: string }[]
  // Inline-create flow: invoked with the full contact payload so the parent
  // can append it to a local list and auto-select it in a combobox.
  onCreated?: (contact: ContactSuccessPayload) => void
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
          onSuccess={(contact) => {
            onCreated?.(contact)
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
