"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import {
  StatusBadge,
  type CustomerStatus,
} from "@/components/customers/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Customer } from "@/lib/db/customers"
import { cn } from "@/lib/utils"

export type SortField = "name" | "value_eur" | "updated_at"
export type SortDirection = "asc" | "desc"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

function formatEur(value: number | null): string {
  return value === null ? "—" : eurFormatter.format(value)
}

function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
}

export function CustomerTable({
  customers,
  sortField,
  sortDirection,
  onSortChange,
}: {
  customers: Customer[]
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField) => void
}) {
  const sorted = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1
    return [...customers].sort((a, b) => {
      switch (sortField) {
        case "name":
          return a.name.localeCompare(b.name) * dir
        case "value_eur": {
          // Treat null as 0 — keeps stable ordering without surprising the
          // user with "missing values floated to the top" weirdness.
          const av = a.value_eur ?? 0
          const bv = b.value_eur ?? 0
          return (av - bv) * dir
        }
        case "updated_at":
          // ISO timestamp strings sort lexicographically as chronological.
          return a.updated_at.localeCompare(b.updated_at) * dir
      }
    })
  }, [customers, sortField, sortDirection])

  // Caller renders the empty state — see /customers page.
  if (customers.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableTh
              field="name"
              activeField={sortField}
              direction={sortDirection}
              onToggle={onSortChange}
            >
              Name
            </SortableTh>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <SortableTh
              field="value_eur"
              activeField={sortField}
              direction={sortDirection}
              onToggle={onSortChange}
              className="text-right"
            >
              Value (€)
            </SortableTh>
            <SortableTh
              field="updated_at"
              activeField={sortField}
              direction={sortDirection}
              onToggle={onSortChange}
            >
              Last updated
            </SortableTh>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CustomerRow({ customer }: { customer: Customer }) {
  const router = useRouter()
  return (
    <TableRow
      onClick={() => router.push(`/customers/${customer.id}`)}
      className="cursor-pointer hover:bg-muted/50"
    >
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {customer.company ?? "—"}
      </TableCell>
      <TableCell>
        <StatusBadge status={customer.status as CustomerStatus} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatEur(customer.value_eur)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatRelative(customer.updated_at)}
      </TableCell>
    </TableRow>
  )
}

function SortableTh({
  field,
  activeField,
  direction,
  onToggle,
  className,
  children,
}: {
  field: SortField
  activeField: SortField
  direction: SortDirection
  onToggle: (field: SortField) => void
  className?: string
  children: React.ReactNode
}) {
  const active = field === activeField
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(field)}
        className={cn(
          "inline-flex items-center gap-1 text-left transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        {active && (
          direction === "asc" ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )
        )}
      </button>
    </TableHead>
  )
}
