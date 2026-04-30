"use client"

import { useMemo, useState } from "react"
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

export type ContactOption = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  position: string | null
  company_id: string | null
  // Optional company name for the trailing "@ Company" hint.
  company_name?: string | null
}

const NONE_VALUE = "__none__"
const CREATE_VALUE = "__create__"

function fullName(c: ContactOption): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ")
}

function secondaryLine(c: ContactOption): string {
  const parts: string[] = []
  if (c.position) parts.push(c.position)
  if (c.company_name) parts.push(`@ ${c.company_name}`)
  return parts.join(" ")
}

export function ContactCombobox({
  value,
  onChange,
  contacts,
  disabled,
  placeholder = "Select contact…",
  noneLabel = "(No contact)",
  // When set, the combobox initially shows only contacts at this company.
  // The user can still clear the filter with the toggle to see everyone.
  scopeCompanyId,
  onCreateNew,
}: {
  value: string | null
  onChange: (next: string | null) => void
  contacts: ContactOption[]
  disabled?: boolean
  placeholder?: string
  noneLabel?: string
  scopeCompanyId?: string | null
  // When provided, a "+ Neuen Kontakt anlegen" item appears at the bottom
  // of the dropdown. Selection closes the popover and invokes the callback.
  onCreateNew?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [scoped, setScoped] = useState(true)

  const selected = value
    ? contacts.find((c) => c.id === value) ?? null
    : null

  // When scoped: show only contacts at the given company (plus the
  // currently-selected one even if it's somewhere else, so the trigger
  // label and the listbox stay in sync).
  const visible = useMemo(() => {
    if (!scopeCompanyId || !scoped) return contacts
    return contacts.filter(
      (c) => c.company_id === scopeCompanyId || c.id === value
    )
  }, [contacts, scopeCompanyId, scoped, value])

  const showScopeToggle = !!scopeCompanyId

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
          {selected ? fullName(selected) : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name, email, or position…" />
          {showScopeToggle && (
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                {scoped ? "Showing this company's contacts" : "Showing all contacts"}
              </span>
              <button
                type="button"
                onClick={() => setScoped((s) => !s)}
                className="rounded-md px-2 py-1 text-foreground transition-colors hover:bg-muted"
              >
                {scoped ? "Show all" : "Filter by company"}
              </button>
            </div>
          )}
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
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
              {visible.map((contact) => {
                const name = fullName(contact)
                const sub = secondaryLine(contact)
                return (
                  <CommandItem
                    key={contact.id}
                    // cmdk's filter matches against this string. Include
                    // every searchable surface — name, email, position —
                    // plus the id to disambiguate same-name contacts.
                    value={`${name} ${contact.email ?? ""} ${contact.position ?? ""} ${contact.id}`}
                    onSelect={() => {
                      onChange(contact.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{name}</span>
                      {sub && (
                        <span className="truncate text-xs text-muted-foreground">
                          {sub}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
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
                    Neuen Kontakt anlegen
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
