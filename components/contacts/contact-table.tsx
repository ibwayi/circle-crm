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

function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
}

function fullName(c: ContactWithCounts): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ")
}

export function ContactTable({
  contacts,
}: {
  contacts: ContactWithCounts[]
}) {
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
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
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              onClick={() => router.push(`/contacts/${contact.id}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">{fullName(contact)}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
