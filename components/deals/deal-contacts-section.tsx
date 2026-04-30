"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Users } from "lucide-react"

import { AddDealContactDialog } from "@/components/deals/add-deal-contact-dialog"
import { DealContactRowActions } from "@/components/deals/deal-contact-row-actions"
import type { ContactOption } from "@/components/shared/contact-combobox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ContactWithPrimaryFlag } from "@/lib/db/deals"

function fullName(c: ContactWithPrimaryFlag): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ")
}

function initials(c: ContactWithPrimaryFlag): string {
  const first = c.first_name.charAt(0)
  const last = c.last_name?.charAt(0) ?? ""
  return (first + last).toUpperCase() || "?"
}

export function DealContactsSection({
  dealId,
  dealCompanyId,
  contacts,
  candidates,
}: {
  dealId: string
  dealCompanyId: string | null
  // Already-linked contacts (primary first, then by name).
  contacts: ContactWithPrimaryFlag[]
  // All contacts the user can pick from in the link dialog. The dialog
  // filters to the deal's company by default.
  candidates: ContactOption[]
}) {
  const [addOpen, setAddOpen] = useState(false)

  const primary = contacts.find((c) => c.is_primary) ?? null
  const primaryName = primary ? fullName(primary) : null
  const linkedIds = new Set(contacts.map((c) => c.id))
  const availableCandidates = candidates.filter((c) => !linkedIds.has(c.id))

  return (
    <section aria-labelledby="deal-contacts-heading" className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 id="deal-contacts-heading" className="text-base font-medium">
          Contacts{" "}
          <span className="text-xs text-muted-foreground">
            ({contacts.length})
          </span>
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={availableCandidates.length === 0}
          title={
            availableCandidates.length === 0
              ? "All your contacts are already linked to this deal"
              : undefined
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add contact
        </Button>
      </header>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-card px-4 py-8 text-center">
          <Users
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">No contacts linked yet</p>
          <p className="text-sm text-muted-foreground">
            Add the people involved in this deal.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="group flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/30"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {initials(contact)}
              </span>
              <Link
                href={`/contacts/${contact.id}`}
                className="flex min-w-0 flex-1 flex-col gap-0.5 underline-offset-4 hover:underline"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {fullName(contact)}
                  </span>
                  {contact.is_primary && (
                    <Badge
                      variant="outline"
                      className="shrink-0 px-1.5 py-0 text-[10px] uppercase tracking-wide"
                    >
                      Primary
                    </Badge>
                  )}
                </span>
                {contact.position && (
                  <span className="truncate text-xs text-muted-foreground">
                    {contact.position}
                  </span>
                )}
              </Link>
              <DealContactRowActions
                dealId={dealId}
                contact={{
                  id: contact.id,
                  first_name: contact.first_name,
                  last_name: contact.last_name,
                }}
                isPrimary={contact.is_primary}
                currentPrimaryName={
                  contact.is_primary ? null : primaryName
                }
              />
            </li>
          ))}
        </ul>
      )}

      <AddDealContactDialog
        dealId={dealId}
        dealCompanyId={dealCompanyId}
        contacts={availableCandidates}
        currentPrimary={
          primary
            ? {
                id: primary.id,
                first_name: primary.first_name,
                last_name: primary.last_name,
              }
            : null
        }
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </section>
  )
}
