"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import { StaleBadge } from "@/components/deals/stale-badge"
import { StageBadge } from "@/components/deals/stage-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DealStage, DealWithRelations } from "@/lib/db/deals"
import { cn } from "@/lib/utils"

export type DealSortField =
  | "title"
  | "stage"
  | "value_eur"
  | "expected_close_date"
  | "updated_at"
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

function formatExpectedClose(iso: string | null): string {
  if (iso === null) return "—"
  // expected_close_date is YYYY-MM-DD (no timezone). Format as the German
  // short date — sub-day precision is irrelevant for a planning field.
  return format(new Date(iso), "d. MMM yyyy", { locale: de })
}

const STAGE_RANK: Record<DealStage, number> = {
  lead: 0,
  qualified: 1,
  proposal: 2,
  negotiation: 3,
  won: 4,
  lost: 5,
}

function fullContactName(c: DealWithRelations["primary_contact"]): string {
  if (!c) return "—"
  return [c.first_name, c.last_name].filter(Boolean).join(" ")
}

export function DealTable({
  deals,
  sortField,
  sortDirection,
  onSortChange,
  hideHeader = false,
  selection,
}: {
  deals: DealWithRelations[]
  sortField: DealSortField
  sortDirection: SortDirection
  onSortChange: (field: DealSortField) => void
  hideHeader?: boolean
  // Phase 29: optional multi-select. When passed, the table renders a
  // checkbox column on the left + tri-state header checkbox. When
  // omitted, the table renders without any checkbox column (used by
  // DealGroupsView's nested tables where selection is owned by the
  // parent groups view).
  selection?: {
    isSelected: (id: string) => boolean
    toggle: (id: string) => void
    toggleAll: () => void
    mode: "none" | "some" | "all"
  }
}) {
  const sorted = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1
    return [...deals].sort((a, b) => {
      switch (sortField) {
        case "title":
          return a.title.localeCompare(b.title) * dir
        case "stage": {
          const cmp =
            STAGE_RANK[a.stage as DealStage] - STAGE_RANK[b.stage as DealStage]
          // Within a stage, fall back to created_at DESC so newest deals
          // float to the top regardless of sort direction.
          if (cmp !== 0) return cmp * dir
          return b.created_at.localeCompare(a.created_at)
        }
        case "value_eur": {
          // NULL values sort to the bottom regardless of direction —
          // unvalued deals shouldn't crowd the top of either sort.
          if (a.value_eur === null && b.value_eur === null) return 0
          if (a.value_eur === null) return 1
          if (b.value_eur === null) return -1
          return (a.value_eur - b.value_eur) * dir
        }
        case "expected_close_date": {
          // NULL close dates sort to the bottom (same reasoning as value).
          const av = a.expected_close_date
          const bv = b.expected_close_date
          if (av === null && bv === null) return 0
          if (av === null) return 1
          if (bv === null) return -1
          return av.localeCompare(bv) * dir
        }
        case "updated_at":
          return a.updated_at.localeCompare(b.updated_at) * dir
      }
    })
  }, [deals, sortField, sortDirection])

  if (deals.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        {!hideHeader && (
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
              <SortableTh
                field="title"
                activeField={sortField}
                direction={sortDirection}
                onToggle={onSortChange}
              >
                Title
              </SortableTh>
              <TableHead className="hidden sm:table-cell">Company</TableHead>
              <TableHead className="hidden md:table-cell">
                Primary contact
              </TableHead>
              <SortableTh
                field="stage"
                activeField={sortField}
                direction={sortDirection}
                onToggle={onSortChange}
              >
                Stage
              </SortableTh>
              <SortableTh
                field="value_eur"
                activeField={sortField}
                direction={sortDirection}
                onToggle={onSortChange}
                className="text-right"
              >
                Value
              </SortableTh>
              <SortableTh
                field="expected_close_date"
                activeField={sortField}
                direction={sortDirection}
                onToggle={onSortChange}
                className="hidden lg:table-cell"
              >
                Expected close
              </SortableTh>
              <SortableTh
                field="updated_at"
                activeField={sortField}
                direction={sortDirection}
                onToggle={onSortChange}
                className="hidden md:table-cell"
              >
                Last updated
              </SortableTh>
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {sorted.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              selection={selection}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DealRow({
  deal,
  selection,
}: {
  deal: DealWithRelations
  selection?: {
    isSelected: (id: string) => boolean
    toggle: (id: string) => void
    toggleAll: () => void
    mode: "none" | "some" | "all"
  }
}) {
  const router = useRouter()
  const checked = selection?.isSelected(deal.id) ?? false

  function handleRowClick() {
    router.push(`/deals/${deal.id}`)
  }

  return (
    <TableRow
      onClick={handleRowClick}
      className={cn(
        "cursor-pointer hover:bg-muted/50",
        checked && "bg-muted/50"
      )}
    >
      {selection && (
        <TableCell
          className="w-10"
          onClick={(e) => {
            // Cell click triggers checkbox; row click is preserved for
            // non-cell areas via the TableRow's handleRowClick.
            e.stopPropagation()
            selection.toggle(deal.id)
          }}
        >
          <RowCheckbox
            checked={checked}
            onChange={() => selection.toggle(deal.id)}
            ariaLabel={`Deal ${deal.title} auswählen`}
          />
        </TableCell>
      )}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="truncate">{deal.title}</span>
          {/* Inline next to the title rather than a new column — the
              "Last updated" column already shows the relative time on
              md+; the badge is the action signal that the date alone
              doesn't surface. */}
          <StaleBadge updatedAt={deal.updated_at} stage={deal.stage} />
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {deal.company ? (
          <Link
            href={`/companies/${deal.company.id}`}
            onClick={(e) => e.stopPropagation()}
            className="underline-offset-4 hover:underline"
          >
            {deal.company.name}
          </Link>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {deal.primary_contact ? (
          <Link
            href={`/contacts/${deal.primary_contact.id}`}
            onClick={(e) => e.stopPropagation()}
            className="underline-offset-4 hover:underline"
          >
            {fullContactName(deal.primary_contact)}
          </Link>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <StageBadge stage={deal.stage as DealStage} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatEur(deal.value_eur)}
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">
        {formatExpectedClose(deal.expected_close_date)}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {formatRelative(deal.updated_at)}
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
  field: DealSortField
  activeField: DealSortField
  direction: SortDirection
  onToggle: (field: DealSortField) => void
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
          "inline-flex cursor-pointer items-center gap-1 text-left transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        {active &&
          (direction === "asc" ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          ))}
      </button>
    </TableHead>
  )
}

function SelectAllCheckbox({
  mode,
  onToggle,
}: {
  mode: "none" | "some" | "all"
  onToggle: () => void
}) {
  // The native <input type="checkbox"> indeterminate prop only takes
  // effect via DOM property assignment (HTML attribute is ignored).
  // Set it via a callback ref so React doesn't have to track it as
  // controlled state.
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
