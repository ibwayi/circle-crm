"use client"

import { ContactBulkActions } from "@/components/contacts/contact-bulk-actions"
import { ContactTable } from "@/components/contacts/contact-table"
import { useSelection } from "@/lib/hooks/use-selection"
import type { ContactWithCounts } from "@/lib/db/contacts"

/**
 * Client wrapper that owns multi-select state and mounts the bulk
 * action bar alongside the contacts table. Shifts the selection
 * lifecycle out of the server-rendered page so React state can live
 * with the UI that observes it.
 */
export function ContactList({ contacts }: { contacts: ContactWithCounts[] }) {
  const visibleIds = contacts.map((c) => c.id)
  const selection = useSelection(visibleIds)

  return (
    <>
      <ContactTable
        contacts={contacts}
        selection={{
          isSelected: selection.isSelected,
          toggle: selection.toggle,
          toggleAll: selection.toggleAll,
          mode: selection.mode,
        }}
      />
      <ContactBulkActions
        selectedIds={selection.selected}
        visibleContacts={contacts}
        onClear={selection.clear}
      />
    </>
  )
}
