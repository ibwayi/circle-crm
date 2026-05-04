"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Open-state for a dialog that the URL can request via a query
 * parameter (e.g. `?new=true`). Used by the AddXButton components for
 * Cmd+K integration: the palette navigates to `/deals?new=true`, and
 * the dialog appears immediately.
 *
 * Why this hook exists at all:
 *
 * The Phase 26.5 attempt passed an `initialOpen` prop (read server-
 * side from searchParams) into `useState(initialOpen)`. That works
 * for cross-route navigation — the destination page's button mounts
 * for the first time, sees `initialOpen === true`, and renders the
 * dialog. But same-route navigation (e.g. already on /deals, hitting
 * Cmd+K → "Neuer Deal") doesn't re-mount the button — `useState`
 * only honours the initial value once, so the new `?new=true` is
 * ignored.
 *
 * Fix: react to `searchParams` changes via `useEffect`. When the URL
 * flips to `?new=true`, set internal `open` state to true and strip
 * the param via `window.history.replaceState` (no Next.js re-render
 * cascade — see Phase 26.5 for why we avoid `router.replace` here).
 *
 * Why we suppress the React 19 set-state-in-effect lint rule:
 *
 * The rule's stated concern is cascading renders from synchronous
 * setState in effects deriving state. This hook is an *external-store
 * sync* — the URL is the external store, the dialog state is the
 * derived view. React's docs explicitly call this out as a legitimate
 * `useEffect` use case. The cascade is also self-limiting: the same
 * effect strips the URL on the same tick, so the next render sees
 * `requestedOpen === false` and the effect no-ops.
 */
export function useAutoOpenFromQuery(paramName: string): {
  open: boolean
  setOpen: (next: boolean) => void
} {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const requestedOpen = searchParams.get(paramName) === "true"

  // Initial state honours the URL on first render so cross-route
  // navigation lands with the dialog already mounted (no flash of
  // empty list before the dialog appears).
  const [open, setOpen] = useState(requestedOpen)

  useEffect(() => {
    if (!requestedOpen) return
    if (typeof window === "undefined") return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing URL→dialog state across same-route nav; rule cascade-concern is moot because the param is stripped on the same tick.
    setOpen(true)

    const params = new URLSearchParams(searchParams.toString())
    params.delete(paramName)
    const qs = params.toString()
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname)
  }, [requestedOpen, paramName, pathname, searchParams])

  return { open, setOpen }
}
