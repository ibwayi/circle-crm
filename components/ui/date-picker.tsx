"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format, isValid, parse } from "date-fns"
import { de } from "date-fns/locale"

import type { Matcher } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// The text input speaks German short format ("15.04.2026"). The three
// patterns cover what users typically type: zero-padded, unpadded, and
// two-digit years.
const TYPED_FORMATS = ["dd.MM.yyyy", "d.M.yyyy", "dd.MM.yy"] as const
const NORMALIZED_FORMAT = "dd.MM.yyyy"

function parseGermanDate(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  for (const f of TYPED_FORMATS) {
    const d = parse(trimmed, f, new Date(), { locale: de })
    if (isValid(d)) return d
  }
  return null
}

function isWithinBounds(d: Date, min?: Date, max?: Date): boolean {
  if (min && d < min) return false
  if (max && d > max) return false
  return true
}

export type DatePickerProps = {
  value: Date | null
  onChange: (date: Date | null) => void
  // Inclusive bounds. Dates outside the range render greyed-out and
  // become unselectable in the calendar grid; manual typing is also
  // rejected on blur with an inline error.
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
  placeholder = "TT.MM.JJJJ",
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  // Local state for the typed string. Decoupled from `value` so a half-
  // typed "15.4." doesn't get reset on every parent re-render. We only
  // re-sync from `value` when it changes externally (e.g. calendar pick).
  const [inputValue, setInputValue] = useState(
    value ? format(value, NORMALIZED_FORMAT, { locale: de }) : ""
  )
  const [error, setError] = useState<string | null>(null)
  // Track which prop value we're currently mirroring. When the prop
  // changes from the outside (calendar pick, form reset) we re-sync the
  // input. When this component itself caused the change (the user typed
  // a valid date), we skip the re-sync so the user's typing isn't
  // overwritten by the normalised form.
  const lastSyncedRef = useRef<Date | null>(value)

  useEffect(() => {
    if (value === lastSyncedRef.current) return
    lastSyncedRef.current = value
    setInputValue(value ? format(value, NORMALIZED_FORMAT, { locale: de }) : "")
    setError(null)
  }, [value])

  // RDP's `disabled` accepts a Matcher | Matcher[]. Each `before` / `after`
  // matcher is a separate object — they can't be combined on one object.
  // Bounds are exclusive at their boundary in RDP, so to disable "before
  // today" inclusive of today we'd need `before: tomorrow`; we treat the
  // user-supplied bounds as inclusive and let RDP do the off-by-one walk.
  const disabledMatchers: Matcher[] = []
  if (minDate) disabledMatchers.push({ before: minDate })
  if (maxDate) disabledMatchers.push({ after: maxDate })

  function commitParsed(parsed: Date) {
    lastSyncedRef.current = parsed
    onChange(parsed)
    setInputValue(format(parsed, NORMALIZED_FORMAT, { locale: de }))
    setError(null)
  }

  function handleBlur() {
    const trimmed = inputValue.trim()
    if (trimmed === "") {
      // User cleared the input — commit null and clear any error.
      lastSyncedRef.current = null
      onChange(null)
      setError(null)
      return
    }
    const parsed = parseGermanDate(trimmed)
    if (!parsed) {
      // Unparseable — leave the typing in place per spec, no error
      // (the user is still composing). Don't commit a value.
      setError(null)
      return
    }
    if (!isWithinBounds(parsed, minDate, maxDate)) {
      // Out of bounds — null the form value, keep the typed text, show
      // an inline error so the user knows why.
      lastSyncedRef.current = null
      onChange(null)
      setError("Datum außerhalb des erlaubten Bereichs.")
      return
    }
    commitParsed(parsed)
  }

  // Best month to show when the calendar first opens — current selection
  // first, then the closest in-bounds month.
  const defaultMonth = value ?? maxDate ?? minDate

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            // Don't commit per-keystroke. The form value stays at its
            // previous state until blur — avoids jumpy intermediate
            // commits when the user is still typing.
            if (error) setError(null)
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-10",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          aria-invalid={!!error || undefined}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            type="button"
            disabled={disabled}
            aria-label="Kalender öffnen"
            className={cn(
              "absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              locale={de}
              selected={value ?? undefined}
              defaultMonth={defaultMonth}
              onSelect={(d) => {
                if (!d) {
                  lastSyncedRef.current = null
                  onChange(null)
                  setInputValue("")
                  setError(null)
                  return
                }
                commitParsed(d)
                setOpen(false)
              }}
              disabled={
                disabledMatchers.length > 0 ? disabledMatchers : undefined
              }
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
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
