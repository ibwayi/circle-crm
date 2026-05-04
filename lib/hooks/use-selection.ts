"use client"

import { useCallback, useMemo, useState } from "react"

/**
 * Generic multi-select state for list rows. Backs the bulk-action UX
 * across deals/contacts/companies/tasks tables. Module-agnostic — pass
 * the IDs of the currently visible rows so `toggleAll` knows the
 * universe.
 *
 * Selection persists across re-renders but resets on page navigation
 * (just useState, no URL or localStorage). That's intentional: bulk
 * operations should be a focused, in-page activity — wandering off the
 * list shouldn't carry the selection along.
 */
export type SelectionMode = "none" | "some" | "all"

export type Selection = {
  selected: ReadonlySet<string>
  count: number
  mode: SelectionMode
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  toggleAll: () => void
  clear: () => void
  setSelected: (ids: Iterable<string>) => void
}

export function useSelection(visibleIds: readonly string[]): Selection {
  const [selected, setSelectedState] = useState<ReadonlySet<string>>(
    () => new Set()
  )

  // Mode derives from the intersection of selection × current visible
  // set. A row that's been filtered out doesn't count as "selected"
  // for the tri-state header checkbox, but it stays in the underlying
  // Set so re-applying the filter restores it.
  const mode: SelectionMode = useMemo(() => {
    if (visibleIds.length === 0) return "none"
    let visibleSelectedCount = 0
    for (const id of visibleIds) {
      if (selected.has(id)) visibleSelectedCount++
    }
    if (visibleSelectedCount === 0) return "none"
    if (visibleSelectedCount === visibleIds.length) return "all"
    return "some"
  }, [selected, visibleIds])

  const toggle = useCallback((id: string) => {
    setSelectedState((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedState((prev) => {
      // If every visible row is selected → clear visible (keep
      // off-screen selections). Otherwise → add every visible to the
      // selection.
      const visibleSet = new Set(visibleIds)
      const allVisibleSelected = visibleIds.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleSet) next.delete(id)
      } else {
        for (const id of visibleSet) next.add(id)
      }
      return next
    })
  }, [visibleIds])

  const clear = useCallback(() => {
    setSelectedState(new Set())
  }, [])

  const setSelected = useCallback((ids: Iterable<string>) => {
    setSelectedState(new Set(ids))
  }, [])

  const isSelected = useCallback((id: string) => selected.has(id), [selected])

  return {
    selected,
    count: selected.size,
    mode,
    isSelected,
    toggle,
    toggleAll,
    clear,
    setSelected,
  }
}
