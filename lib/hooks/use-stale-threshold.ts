"use client"

import { useCallback, useEffect, useState } from "react"

import { STALE_THRESHOLD_DEFAULT_DAYS } from "@/lib/utils/stale"

const STORAGE_KEY = "circle:stale-threshold"

/**
 * Per-user stale-threshold preference, persisted in localStorage. SSR-
 * safe: the initial render uses the default (matching what server
 * components see), and the effect re-syncs on mount if a stored value
 * exists. This momentarily-stale-on-first-paint approach mirrors the
 * `circle:deals-view` pattern in `deals-list.tsx` — simpler than a
 * `useSyncExternalStore` setup since this preference is only consumed
 * by client components that already need a useEffect for re-render.
 *
 * Server-rendered surfaces (Dashboard's "Vernachlässigte Deals"
 * section, the `?stale=true` filter on /deals) intentionally use the
 * default threshold rather than reading the user's preference — the
 * preference lives on the client. v1: don't worry about the
 * server-side override; if a user changes the threshold to 14 days,
 * the dashboard section keeps using 7. Future phase 28 (user
 * preferences DB) lifts this to a proper per-user setting.
 */
export function useStaleThreshold(): readonly [number, (days: number) => void] {
  const [threshold, setThresholdState] = useState<number>(
    STALE_THRESHOLD_DEFAULT_DAYS
  )

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      stored = null
    }
    if (!stored) return
    const parsed = parseInt(stored, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      setThresholdState(parsed)
    }
  }, [])

  const setThreshold = useCallback((days: number) => {
    if (!Number.isFinite(days) || days <= 0) return
    setThresholdState(days)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(days))
    } catch {
      // Ignore quota errors; in-memory state still works for the session.
    }
  }, [])

  return [threshold, setThreshold] as const
}
