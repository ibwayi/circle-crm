"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import { DeleteCustomerDialog } from "@/components/customers/delete-customer-dialog"
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog"
import {
  StatusBadge,
  type CustomerStatus,
} from "@/components/customers/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  hideHeader = false,
}: {
  customers: Customer[]
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField) => void
  /**
   * Omit the table header — used inside the Groups view where the section
   * header is the visual heading, so a per-group "Name / Company / …" row
   * would just be repetitive noise.
   */
  hideHeader?: boolean
}) {
  const sorted = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1
    return [...customers].sort((a, b) => {
      switch (sortField) {
        case "name":
          return a.name.localeCompare(b.name) * dir
        case "value_eur": {
          const av = a.value_eur ?? 0
          const bv = b.value_eur ?? 0
          return (av - bv) * dir
        }
        case "updated_at":
          return a.updated_at.localeCompare(b.updated_at) * dir
      }
    })
  }, [customers, sortField, sortDirection])

  if (customers.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        {!hideHeader && (
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
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
        )}
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
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Suppress row navigation while a dialog is open or the menu is mid-click —
  // otherwise the underlying TableRow's onClick can fire on the same tap.
  const [menuOpen, setMenuOpen] = useState(false)

  function handleRowClick() {
    if (menuOpen || editOpen || deleteOpen) return
    router.push(`/customers/${customer.id}`)
  }

  return (
    <>
      <TableRow
        onClick={handleRowClick}
        className="group cursor-pointer hover:bg-muted/50"
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
        <TableCell
          className="w-10 p-0 pr-2 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              aria-label={`Actions for ${customer.name}`}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md transition-opacity",
                "hover:bg-muted focus-visible:bg-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                // Always visible on touch devices; hover/focus-only on
                // pointer-fine devices to keep the row clean.
                "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                menuOpen && "md:opacity-100"
              )}
            >
              <MoreHorizontal
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      <EditCustomerDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCustomerDialog
        customer={customer}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
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
