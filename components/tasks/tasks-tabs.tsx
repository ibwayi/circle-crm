"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type TasksTab = "today" | "overdue" | "upcoming" | "completed"

const TABS: { value: TasksTab; label: string }[] = [
  { value: "today", label: "Heute" },
  { value: "overdue", label: "Überfällig" },
  { value: "upcoming", label: "Demnächst" },
  { value: "completed", label: "Erledigt" },
]

export function TasksTabs({
  initial,
  counts,
}: {
  initial: TasksTab
  counts: Record<TasksTab, number>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "today") params.delete("tab")
    else params.set("tab", next)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <Tabs value={initial} onValueChange={handleChange}>
      <TabsList className="flex-wrap">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            <span className="ml-2 text-xs text-muted-foreground">
              {counts[tab.value]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
