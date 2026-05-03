"use client"

import { useCallback, useSyncExternalStore } from "react"

import { STALE_THRESHOLD_DEFAULT_DAYS } from "@/lib/utils/stale"

const STORAGE_KEY = "circle:stale-threshold"
const STORAGE_EVENT = "circle:stale-threshold-change"

/**
 * Per-user stale-threshold preference, persisted in localStorage.
 *
 * Server-rendered surfaces (Dashboard's "Vernachlässigte Deals"
 * section, the `?stale=true` filter on /deals) intentionally use the
 * default threshold rather than reading the user's preference — the
 * preference lives on the client. v1: don't worry about the
 * server-side override; if a user changes the threshold to 14 days,
 * the dashboard section keeps using 7. Future Phase 28 (user prefs
 * DB) will lift this to a proper per-user setting.
 *
 * Implementation mirrors the deals-view pattern in
 * components/deals/deals-list.tsx and the collapsed-groups pattern in
 * deal-groups-view.tsx — useSyncExternalStore over localStorage with
 * a custom event for in-tab updates and the standard `storage` event
 * for cross-tab sync.
 */

let cachedRaw: string | null | undefined = undefined
let cachedThreshold = STALE_THRESHOLD_DEFAULT_DAYS

function readThreshold(): number {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw === cachedRaw) return cachedThreshold
  cachedRaw = raw
  if (!raw) {
    cachedThreshold = STALE_THRESHOLD_DEFAULT_DAYS
    return cachedThreshold
  }
  const parsed = parseInt(raw, 10)
  cachedThreshold =
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : STALE_THRESHOLD_DEFAULT_DAYS
  return cachedThreshold
}

function subscribeStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback)
  window.addEventListener(STORAGE_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(STORAGE_EVENT, callback)
  }
}

function getServerThreshold(): number {
  return STALE_THRESHOLD_DEFAULT_DAYS
}

export function useStaleThreshold(): readonly [number, (days: number) => void] {
  const threshold = useSyncExternalStore(
    subscribeStorage,
    readThreshold,
    getServerThreshold
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
