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

import { updateCustomerAction } from "@/app/(app)/customers/actions"
import { CustomerKanbanCard } from "@/components/customers/customer-kanban-card"
import {
  STATUS_CONFIG,
  type CustomerStatus,
} from "@/components/customers/status-badge"
import type { Customer } from "@/lib/db/customers"
import { cn } from "@/lib/utils"

const STATUS_ORDER: CustomerStatus[] = ["lead", "customer", "closed"]

const EMPTY_LABELS: Record<CustomerStatus, string> = {
  lead: "No leads yet",
  customer: "No customers yet",
  closed: "No closed deals yet",
}

type OptimisticAction = { id: string; status: CustomerStatus }

export function CustomerKanban({ customers }: { customers: Customer[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)

  // useOptimistic shows the in-flight status until the surrounding
  // transition resolves. On success, revalidatePath in the action causes
  // the customers prop to update with the new status — the optimistic
  // change becomes the base state seamlessly. On error, the transition
  // ends without changing the base, so the optimistic update is dropped
  // and the card visually snaps back.
  const [optimisticCustomers, addOptimistic] = useOptimistic(
    customers,
    (state, action: OptimisticAction) =>
      state.map((c) =>
        c.id === action.id ? { ...c, status: action.status } : c
      )
  )

  const sensors = useSensors(
    // Require 5px of movement before activating the drag — prevents an
    // accidental drag on a simple click and lets onClick navigate when
    // the user just taps a card.
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
    const data = over.data.current as { status?: CustomerStatus } | undefined
    const newStatus = data?.status
    if (!newStatus) return

    // The active row uses the optimistic state, but a new drag starts from
    // a fresh customer object — read from the displayed (optimistic) list.
    const customer = optimisticCustomers.find((c) => c.id === id)
    if (!customer || customer.status === newStatus) return

    startTransition(async () => {
      addOptimistic({ id, status: newStatus })
      const result = await updateCustomerAction(id, { status: newStatus })
      if (!result.ok) {
        toast.error("Failed to update status", { description: result.error })
        // No explicit rollback needed — useOptimistic drops the action when
        // the transition ends, so the card snaps back to its old column.
      }
      // On success, revalidatePath in the action triggers a refetch which
      // updates the customers prop. Force the refresh so the client picks
      // up the new RSC payload promptly.
      router.refresh()
    })
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    customers: optimisticCustomers.filter((c) => c.status === status),
  }))

  const activeCustomer = activeId
    ? optimisticCustomers.find((c) => c.id === activeId) ?? null
    : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* Mobile: horizontal scroll (industry standard for kanban on small
          screens). Desktop: 3-column grid. */}
      <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-x-visible md:px-0">
        {grouped.map(({ status, customers: columnCustomers }) => (
          <KanbanColumn
            key={status}
            status={status}
            customers={columnCustomers}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCustomer ? (
          <CustomerKanbanCard customer={activeCustomer} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  status,
  customers,
  activeId,
}: {
  status: CustomerStatus
  customers: Customer[]
  activeId: string | null
}) {
  const config = STATUS_CONFIG[status]
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-card transition-colors md:w-auto md:shrink",
        isOver && "border-primary/30 bg-muted/40"
      )}
    >
      <header className="flex items-center gap-2 rounded-t-lg border-b border-border bg-card px-4 py-3">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `var(${config.cssVar})` }}
        />
        <h3 className="text-sm font-medium">{config.label}</h3>
        <span className="text-xs text-muted-foreground">
          {customers.length}
        </span>
      </header>

      <div className="flex max-h-[calc(100vh-300px)] flex-col gap-2 overflow-y-auto p-3">
        {customers.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {EMPTY_LABELS[status]}
          </p>
        ) : (
          customers.map((customer) => (
            <DraggableCard
              key={customer.id}
              customer={customer}
              hidden={customer.id === activeId}
            />
          ))
        )}
      </div>
    </div>
  )
}

function DraggableCard({
  customer,
  hidden,
}: {
  customer: Customer
  hidden: boolean
}) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: customer.id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    // Hide the source card while the drag overlay is showing — the overlay
    // becomes the visible "moving" element. opacity-0 keeps the layout slot
    // so other cards don't reflow during drag.
    opacity: hidden || isDragging ? 0 : 1,
  }

  function handleClick() {
    // PointerSensor's activation constraint blocks dragstart for clicks
    // under 5px movement, so this fires only on a true tap.
    router.push(`/customers/${customer.id}`)
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
      aria-label={`Drag ${customer.name}`}
    >
      <CustomerKanbanCard customer={customer} />
    </div>
  )
}
