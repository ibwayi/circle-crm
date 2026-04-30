"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

import type { Matcher } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Long German format used everywhere dates are surfaced — info cards,
// detail headers, the trigger button below. "15. April 2026".
const TRIGGER_FORMAT = "d. MMMM yyyy"

export type DatePickerProps = {
  value: Date | null
  onChange: (date: Date | null) => void
  // Inclusive bounds. Dates outside the range render greyed-out and
  // become unselectable in the calendar grid.
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Datum auswählen",
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  // react-day-picker uses `undefined` for "no selection"; the public API
  // uses `null` to match the rest of the form layer (Zod nullable, DB
  // nullable, combobox null sentinel). Translate at the boundary.
  const selected = value ?? undefined

  // RDP's `disabled` accepts a Matcher | Matcher[]. Each `before` / `after`
  // matcher is a separate object — they can't be combined on one object.
  // Bounds are exclusive at their boundary in RDP, so to disable "before
  // today" inclusive of today we'd need `before: tomorrow`; we treat the
  // user-supplied bounds as inclusive and let RDP do the off-by-one walk.
  const disabledMatchers: Matcher[] = []
  if (minDate) disabledMatchers.push({ before: minDate })
  if (maxDate) disabledMatchers.push({ after: maxDate })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-left text-sm",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {value ? format(value, TRIGGER_FORMAT, { locale: de }) : placeholder}
        </span>
        <CalendarIcon
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={de}
          selected={selected}
          // Default the visible month to the current selection or the
          // closest in-range month so the calendar opens somewhere
          // useful even before the user picks.
          defaultMonth={selected ?? maxDate ?? minDate}
          onSelect={(d) => {
            onChange(d ?? null)
            if (d) setOpen(false)
          }}
          disabled={
            disabledMatchers.length > 0 ? disabledMatchers : undefined
          }
          // Show year + month dropdowns when the bounds span more than a
          // year — useful for birthdays going back to 1900. Otherwise
          // keep the simpler "Month YYYY" label.
          captionLayout={
            minDate && maxDate
              ? maxDate.getFullYear() - minDate.getFullYear() > 1
                ? "dropdown"
                : "label"
              : "label"
          }
          startMonth={minDate}
          endMonth={maxDate}
        />
      </PopoverContent>
    </Popover>
  )
}
