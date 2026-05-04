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
import { cn } from "@/lib/utils"

function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
}

export function CompanyTable({
  companies,
  selection,
}: {
  companies: CompanyWithCounts[]
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
          {companies.map((company) => {
            const checked = selection?.isSelected(company.id) ?? false
            return (
              <TableRow
                key={company.id}
                onClick={() => router.push(`/companies/${company.id}`)}
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
                      selection.toggle(company.id)
                    }}
                  >
                    <RowCheckbox
                      checked={checked}
                      onChange={() => selection.toggle(company.id)}
                      ariaLabel={`Firma ${company.name} auswählen`}
                    />
                  </TableCell>
                )}
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
