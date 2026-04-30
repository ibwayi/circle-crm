"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ContactForm } from "@/components/contacts/contact-form"
import type { Contact } from "@/lib/db/contacts"

export function EditContactDialog({
  contact,
  companies,
  open,
  onOpenChange,
}: {
  contact: Contact
  companies: { id: string; name: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const fullName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
          <DialogDescription>Update {fullName}&apos;s details.</DialogDescription>
        </DialogHeader>
        <ContactForm
          key={contact.id}
          mode="edit"
          contact={contact}
          companies={companies}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
