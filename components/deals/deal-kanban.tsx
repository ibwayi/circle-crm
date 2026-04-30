"use client"

import { useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"

import { updateDealStageAction } from "@/app/(app)/deals/actions"
import { DealKanbanCard } from "@/components/deals/deal-kanban-card"
import { STAGE_CONFIG, STAGE_ORDER } from "@/components/deals/stage-badge"
import type { DealStage, DealWithRelations } from "@/lib/db/deals"
import { cn } from "@/lib/utils"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const EMPTY_LABELS: Record<DealStage, string> = {
  lead: "No leads yet",
  qualified: "Nothing qualified yet",
  proposal: "No active proposals",
  negotiation: "Nothing in negotiation",
  won: "No wins yet",
  lost: "No losses yet",
}

type OptimisticAction = { id: string; stage: DealStage }

export function DealKanban({ deals }: { deals: DealWithRelations[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)

  const [optimisticDeals, addOptimistic] = useOptimistic(
    deals,
    (state, action: OptimisticAction) =>
      state.map((d) =>
        d.id === action.id ? { ...d, stage: action.stage } : d
      )
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)

    const { active, over } = event
    if (!over) return

    const id = String(active.id)
    const data = over.data.current as { stage?: DealStage } | undefined
    const newStage = data?.stage
    if (!newStage) return

    const deal = optimisticDeals.find((d) => d.id === id)
    if (!deal || deal.stage === newStage) return

    startTransition(async () => {
      addOptimistic({ id, stage: newStage })
      const result = await updateDealStageAction(id, newStage)
      if (!result.ok) {
        toast.error("Failed to update stage", { description: result.error })
        // useOptimistic drops the action when the transition ends — the
        // card snaps back to its old column on error.
      }
      router.refresh()
    })
  }

  const grouped = STAGE_ORDER.map((stage) => ({
    stage,
    deals: optimisticDeals.filter((d) => d.stage === stage),
  }))

  const activeDeal = activeId
    ? optimisticDeals.find((d) => d.id === activeId) ?? null
    : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* Six columns at ~280px each = ~1700px. Below xl (1280px) we fall
          back to horizontal scroll — the standard kanban-on-mobile pattern.
          Polishing column collapse / responsive splits is a Phase 22 task. */}
      <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 xl:mx-0 xl:grid xl:grid-cols-6 xl:overflow-x-visible xl:px-0">
        {grouped.map(({ stage, deals: columnDeals }) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={columnDeals}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDeal ? <DealKanbanCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  stage,
  deals,
  activeId,
}: {
  stage: DealStage
  deals: DealWithRelations[]
  activeId: string | null
}) {
  const config = STAGE_CONFIG[stage]
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage}`,
    data: { stage },
  })
  const total = deals.reduce((acc, d) => acc + (d.value_eur ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-card transition-colors xl:w-auto xl:shrink",
        isOver && "border-primary/30 bg-muted/40"
      )}
    >
      <header className="flex items-center gap-2 rounded-t-lg border-b border-border bg-card px-4 py-3">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: `var(${config.cssVar})` }}
        />
        <h3 className="text-sm font-medium">{config.label}</h3>
        <span className="text-xs text-muted-foreground">{deals.length}</span>
        {total > 0 && (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {eurFormatter.format(total)}
          </span>
        )}
      </header>

      <div className="flex max-h-[calc(100vh-300px)] flex-col gap-2 overflow-y-auto p-3">
        {deals.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {EMPTY_LABELS[stage]}
          </p>
        ) : (
          deals.map((deal) => (
            <DraggableCard
              key={deal.id}
              deal={deal}
              hidden={deal.id === activeId}
            />
          ))
        )}
      </div>
    </div>
  )
}

function DraggableCard({
  deal,
  hidden,
}: {
  deal: DealWithRelations
  hidden: boolean
}) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: deal.id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: hidden || isDragging ? 0 : 1,
  }

  function handleClick() {
    router.push(`/deals/${deal.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="cursor-grab touch-none transition-transform hover:-translate-y-0.5 active:cursor-grabbing"
      role="button"
      tabIndex={0}
      aria-label={`Drag ${deal.title}`}
    >
      <DealKanbanCard deal={deal} />
    </div>
  )
}
