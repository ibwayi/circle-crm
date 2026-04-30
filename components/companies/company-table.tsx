"use client"

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
import type { CompanyWithCounts } from "@/lib/db/companies"

function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
}

export function CompanyTable({
  companies,
}: {
  companies: CompanyWithCounts[]
}) {
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Industry</TableHead>
            <TableHead className="text-right tabular-nums">Contacts</TableHead>
            <TableHead className="text-right tabular-nums">
              Active deals
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Last updated
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow
              key={company.id}
              onClick={() => router.push(`/companies/${company.id}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {company.industry ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {company.contact_count}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {company.active_deal_count}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatRelative(company.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
