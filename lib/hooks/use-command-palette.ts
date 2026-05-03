"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Module-level open state for the global Cmd+K command palette. Both
 * the palette itself and the topbar's clickable kbd indicator subscribe
 * to the same store, so the topbar button can dispatch open without
 * prop-drilling through the layout.
 *
 * Same useSyncExternalStore-over-event pattern as `useStaleThreshold`
 * and the deals-view persistence in deals-list.tsx — keeps the project
 * stack tight (no Zustand or Context).
 */

const EVENT = "circle:command-palette-change"
let isOpen = false

function read(): boolean {
  return isOpen
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback)
  return () => window.removeEventListener(EVENT, callback)
}

function getServerSnapshot(): boolean {
  return false
}

function dispatch(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(EVENT))
}

export function useCommandPalette(): {
  open: boolean
  setOpen: (next: boolean) => void
  toggle: () => void
} {
  const open = useSyncExternalStore(subscribe, read, getServerSnapshot)

  const setOpen = useCallback((next: boolean) => {
    if (isOpen === next) return
    isOpen = next
    dispatch()
  }, [])

  const toggle = useCallback(() => {
    isOpen = !isOpen
    dispatch()
  }, [])

  return { open, setOpen, toggle }
}
