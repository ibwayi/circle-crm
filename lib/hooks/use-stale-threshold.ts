"use client"

import { useCallback, useSyncExternalStore } from "react"

import { PREFERENCES_CHANGED_EVENT } from "@/lib/constants"
import { STALE_THRESHOLD_DEFAULT_DAYS } from "@/lib/utils/stale"

const STORAGE_KEY = "circle:stale-threshold"
const STORAGE_EVENT = "circle:stale-threshold-change"

/**
 * Per-user stale-threshold preference. Resolution order:
 *   1. localStorage (per-device override — what the user set on this
 *      machine specifically)
 *   2. `initialThreshold` from server preferences (user_preferences
 *      .stale_threshold_days, fetched server-side and passed in by
 *      the caller)
 *   3. STALE_THRESHOLD_DEFAULT_DAYS (7) as the absolute fallback
 *
 * Phase 25 stored only step 1; Phase 28 added the server-side
 * preference layer in step 2 so a value set on the Profile page
 * applies on every device until the user explicitly overrides it
 * locally.
 *
 * Implementation: useSyncExternalStore over localStorage. Same
 * pattern as the deals-view persistence in deals-list.tsx — custom
 * event for in-tab updates, standard `storage` event for cross-tab
 * sync. The cache key includes `initialThreshold` so a preference
 * change invalidates the cached snapshot.
 */

let cachedRaw: string | null | undefined = undefined
let cachedFallback = STALE_THRESHOLD_DEFAULT_DAYS
let cachedThreshold = STALE_THRESHOLD_DEFAULT_DAYS

function readThreshold(fallback: number): number {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw === cachedRaw && fallback === cachedFallback) return cachedThreshold
  cachedRaw = raw
  cachedFallback = fallback
  if (!raw) {
    cachedThreshold = fallback
    return cachedThreshold
  }
  const parsed = parseInt(raw, 10)
  cachedThreshold = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  return cachedThreshold
}

function subscribeStorage(callback: () => void): () => void {
  // PREFERENCES_CHANGED_EVENT fires after the profile form has
  // already cleared the matching localStorage key — the listener
  // only needs to trigger a re-render so the cached snapshot is
  // recomputed from the (now empty) storage and falls back to the
  // server-provided initialThreshold. Phase 29.
  window.addEventListener("storage", callback)
  window.addEventListener(STORAGE_EVENT, callback)
  window.addEventListener(PREFERENCES_CHANGED_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(STORAGE_EVENT, callback)
    window.removeEventListener(PREFERENCES_CHANGED_EVENT, callback)
  }
}

export function useStaleThreshold(
  initialThreshold: number = STALE_THRESHOLD_DEFAULT_DAYS
): readonly [number, (days: number) => void] {
  const threshold = useSyncExternalStore(
    subscribeStorage,
    () => readThreshold(initialThreshold),
    () => initialThreshold
  )

  const setThreshold = useCallback((days: number) => {
    if (!Number.isFinite(days) || days <= 0) return
    try {
      window.localStorage.setItem(STORAGE_KEY, String(days))
      window.dispatchEvent(new Event(STORAGE_EVENT))
    } catch {
      // Ignore quota errors; the preference reverts to default but the
      // session still functions.
    }
  }, [])

  return [threshold, setThreshold] as const
}
