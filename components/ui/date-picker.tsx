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

// The text input speaks German short format ("15.04.2026"). The mask
// below enforces DD.MM.YYYY shape on every keystroke, so most paths only
// need the canonical pattern. We keep `dd.MM.yy` as a fallback so a user
// who types exactly 6 digits and blurs (e.g., "15.04.20") still parses
// to 2020 — date-fns picks the century closest to the reference date.
const TYPED_FORMATS = ["dd.MM.yyyy", "dd.MM.yy"] as const
const NORMALIZED_FORMAT = "dd.MM.yyyy"

function parseGermanDate(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Pre-validate digit-component ranges before handing off to date-fns.
  // date-fns parse() is lenient by default — it would happily turn
  // "13.99.2026" into a date by overflowing month/day into the next
  // year. Reject obvious junk (day > 31 or month > 12) up front so the
  // form sees "Ungültiges Datum" instead of a silently-rolled date.
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(trimmed)
  if (m) {
    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10)
    if (day < 1 || day > 31 || month < 1 || month > 12) return null
  }

  for (const f of TYPED_FORMATS) {
    const d = parse(trimmed, f, new Date(), { locale: de })
    if (!isValid(d)) continue
    // Defense in depth: even when components are in range, ensure the
    // parsed date round-trips to the same components. Catches cases
    // like "31.02.2026" (Feb 31 doesn't exist; date-fns typically
    // rejects but the explicit check is cheap insurance).
    const normalized = format(d, f, { locale: de })
    if (normalized === trimmed.padStart(normalized.length, "0")) return d
    // Also accept the canonical-padded form: user types "1.4.2026", we
    // wouldn't match it via the mask but parse handles it; on the way
    // back we get "01.04.2026" which doesn't equal "1.4.2026". The
    // mask makes this branch unreachable for typed input — kept for
    // pasted values that bypass the mask.
    if (normalized === trimmed) return d
  }
  return null
}

// Auto-format DD.MM.YYYY mask. Strips non-digits, caps at 8 digits, and
// re-inserts dots at positions 2 and 5 as the user types. Idempotent on
// already-formatted strings — backspacing through "15.04.2" gives "15.04."
// from the browser, then this helper strips the trailing dot back to
// "15.04". Pasted strings get the same treatment, which mangles inputs
// that don't match DD.MM.YYYY shape (e.g. "15.4.2026" → "15.42.026") —
// acceptable trade-off per the bug spec.
function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
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
      // Unparseable — keep the typed text in place but flag it as
      // invalid so the form doesn't silently commit a stale value.
      lastSyncedRef.current = null
      onChange(null)
      setError("Ungültiges Datum.")
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
          // 10 = "DD.MM.YYYY" (8 digits + 2 dots). The browser caps input
          // length so the user can't type past a complete date; the mask
          // above keeps the shape consistent.
          maxLength={10}
          value={inputValue}
          onChange={(e) => {
            const formatted = formatDateInput(e.target.value)
            setInputValue(formatted)
            if (error) setError(null)
            // Eager commit when the user has typed a complete DD.MM.YYYY:
            // the form sees the value immediately, no need to wait for
            // blur. Invalid components (day > 31, month > 12, impossible
            // dates) and out-of-bounds dates both flag inline.
            if (formatted.length === 10) {
              const parsed = parseGermanDate(formatted)
              if (parsed && isWithinBounds(parsed, minDate, maxDate)) {
                lastSyncedRef.current = parsed
                onChange(parsed)
              } else if (parsed) {
                lastSyncedRef.current = null
                onChange(null)
                setError("Datum außerhalb des erlaubten Bereichs.")
              } else {
                // 10 chars of "DD.MM.YYYY" shape but unparseable: invalid
                // day/month components or an impossible calendar date
                // like 31.02.2026. Surface the error eagerly so the user
                // doesn't have to blur to learn about it.
                lastSyncedRef.current = null
                onChange(null)
                setError("Ungültiges Datum.")
              }
            } else if (formatted === "") {
              lastSyncedRef.current = null
              onChange(null)
            }
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
