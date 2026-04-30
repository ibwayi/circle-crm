"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

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
}: {
  deals: DealWithRelations[]
  sortField: DealSortField
  sortDirection: SortDirection
  onSortChange: (field: DealSortField) => void
  hideHeader?: boolean
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
            <DealRow key={deal.id} deal={deal} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DealRow({ deal }: { deal: DealWithRelations }) {
  const router = useRouter()

  function handleRowClick() {
    router.push(`/deals/${deal.id}`)
  }

  return (
    <TableRow
      onClick={handleRowClick}
      className="cursor-pointer hover:bg-muted/50"
    >
      <TableCell className="font-medium">{deal.title}</TableCell>
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
          "inline-flex items-center gap-1 text-left transition-colors hover:text-foreground",
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
