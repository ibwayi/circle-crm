"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

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

type CompanyOption = { id: string; name: string }

const NONE_VALUE = "__none__"
const CREATE_VALUE = "__create__"

export function CompanyCombobox({
  value,
  onChange,
  companies,
  disabled,
  placeholder = "Select company…",
  noneLabel = "(No company)",
  onCreateNew,
}: {
  value: string | null
  onChange: (next: string | null) => void
  companies: CompanyOption[]
  disabled?: boolean
  placeholder?: string
  noneLabel?: string
  // When provided, a "+ Neue Firma anlegen" item appears at the bottom of
  // the dropdown. Selection closes the popover and invokes the callback
  // — the parent handles the actual creation flow.
  onCreateNew?: () => void
}) {
  const [open, setOpen] = useState(false)

  const selected = value
    ? companies.find((c) => c.id === value) ?? null
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search companies…" />
          <CommandList>
            <CommandEmpty>No companies found.</CommandEmpty>
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
                <span className="text-muted-foreground">{noneLabel}</span>
              </CommandItem>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  // cmdk uses this string for filter matching. company name
                  // makes "type to search" work; the id disambiguates if
                  // two companies happen to share a name.
                  value={`${company.name} ${company.id}`}
                  onSelect={() => {
                    onChange(company.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === company.id ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  {company.name}
                </CommandItem>
              ))}
              {onCreateNew && (
                <CommandItem
                  value={CREATE_VALUE}
                  onSelect={() => {
                    setOpen(false)
                    onCreateNew()
                  }}
                  className="border-t border-border mt-1 pt-2"
                >
                  <Plus
                    className="mr-2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="text-foreground">
                    Neue Firma anlegen
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
