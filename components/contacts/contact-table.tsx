"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ContactWithCounts } from "@/lib/db/contacts"
import { cn } from "@/lib/utils"

function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
}

function fullName(c: ContactWithCounts): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ")
}

export function ContactTable({
  contacts,
  selection,
}: {
  contacts: ContactWithCounts[]
  selection?: {
    isSelected: (id: string) => boolean
    toggle: (id: string) => void
    toggleAll: () => void
    mode: "none" | "some" | "all"
  }
}) {
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selection && (
              <TableHead className="w-10">
                <SelectAllCheckbox
                  mode={selection.mode}
                  onToggle={selection.toggleAll}
                />
              </TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden sm:table-cell">Company</TableHead>
            <TableHead>Position</TableHead>
            <TableHead className="text-right tabular-nums">
              Active deals
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Last updated
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const checked = selection?.isSelected(contact.id) ?? false
            return (
              <TableRow
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  checked && "bg-muted/50"
                )}
              >
                {selection && (
                  <TableCell
                    className="w-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      selection.toggle(contact.id)
                    }}
                  >
                    <RowCheckbox
                      checked={checked}
                      onChange={() => selection.toggle(contact.id)}
                      ariaLabel={`Kontakt ${fullName(contact)} auswählen`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {fullName(contact)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="underline-offset-4 hover:underline"
                    >
                      {contact.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {contact.company ? (
                    <Link
                      href={`/companies/${contact.company.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="underline-offset-4 hover:underline"
                    >
                      {contact.company.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.position ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {contact.active_deal_count}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {formatRelative(contact.updated_at)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function SelectAllCheckbox({
  mode,
  onToggle,
}: {
  mode: "none" | "some" | "all"
  onToggle: () => void
}) {
  const setRef = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = mode === "some"
  }
  return (
    <input
      type="checkbox"
      ref={setRef}
      checked={mode === "all"}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      aria-label="Alle auswählen"
      className="h-4 w-4 cursor-pointer rounded border border-input accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  )
}

function RowCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel: string
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className="h-4 w-4 cursor-pointer rounded border border-input accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  )
}
