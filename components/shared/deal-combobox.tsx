"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, LayoutGrid } from "lucide-react"

import { StageBadge, type DealStage } from "@/components/deals/stage-badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DealOption = {
  id: string
  title: string
  // Secondary line on the trigger and the listbox: "{title} · {company}".
  // Null means standalone (no company on the deal).
  companyName: string | null
  stage: DealStage
  // Optional — shown as a third tiny line in the dropdown when present.
  // The trigger only renders title + company to keep the row compact.
  primaryContactName: string | null
}

const NONE_VALUE = "__none__"
const PIPELINE_VALUE = "__pipeline__"

export function DealCombobox({
  value,
  onChange,
  deals,
  disabled,
  placeholder = "Deal auswählen…",
  noneLabel = "Keine Verknüpfung (persönliche Aufgabe)",
  onOpenPipelineView,
}: {
  value: string | null
  onChange: (next: string | null) => void
  deals: DealOption[]
  disabled?: boolean
  placeholder?: string
  noneLabel?: string
  // When provided, a "Pipeline-Ansicht öffnen ↗" item appears at the
  // bottom of the dropdown. Selection closes the popover and invokes
  // the callback — the parent owns the modal state and opens it.
  onOpenPipelineView?: () => void
}) {
  const [open, setOpen] = useState(false)

  const selected = value ? deals.find((d) => d.id === value) ?? null : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span
          className={cn(
            "truncate",
            !selected && "italic text-muted-foreground"
          )}
        >
          {selected
            ? selected.companyName
              ? `${selected.title} · ${selected.companyName}`
              : selected.title
            : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Deal oder Firma suchen…" />
          <CommandList>
            <CommandEmpty>Keine Deals gefunden.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={NONE_VALUE}
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden="true"
                />
                <span className="italic text-muted-foreground">
                  {noneLabel}
                </span>
              </CommandItem>
              {deals.map((deal) => (
                <CommandItem
                  key={deal.id}
                  // cmdk filters against this string. Include title +
                  // company + primary contact so all three are searchable;
                  // append id to disambiguate same-title deals.
                  value={`${deal.title} ${deal.companyName ?? ""} ${deal.primaryContactName ?? ""} ${deal.id}`}
                  onSelect={() => {
                    onChange(deal.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === deal.id ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{deal.title}</span>
                    {(deal.companyName || deal.primaryContactName) && (
                      <span className="truncate text-xs text-muted-foreground">
                        {[deal.companyName, deal.primaryContactName]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                  <StageBadge
                    stage={deal.stage}
                    className="ml-2 shrink-0 px-1.5 py-0 text-[10px]"
                  />
                </CommandItem>
              ))}
              {onOpenPipelineView && (
                <CommandItem
                  value={PIPELINE_VALUE}
                  onSelect={() => {
                    setOpen(false)
                    onOpenPipelineView()
                  }}
                  className="mt-1 border-t border-border pt-2"
                >
                  <LayoutGrid
                    className="mr-2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="text-foreground">
                    Pipeline-Ansicht öffnen
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ↗
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
