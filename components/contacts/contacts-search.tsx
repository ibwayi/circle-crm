"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

// Inline debounce — same pattern as customer-list.tsx and companies-search.tsx.
function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(
        () => callbackRef.current(...args),
        delay
      )
    },
    [delay]
  )
}

export function ContactsSearch({ initialValue }: { initialValue: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [value, setValue] = useState(initialValue)

  const debouncedUpdate = useDebouncedCallback((next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next.trim()) {
      params.set("search", next)
    } else {
      params.delete("search")
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, 200)

  function handleChange(next: string) {
    setValue(next)
    debouncedUpdate(next)
  }

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search by name, email, or position…"
        className="pl-9"
        aria-label="Search contacts"
      />
    </div>
  )
}
