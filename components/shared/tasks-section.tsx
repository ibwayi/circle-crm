"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { AddTaskDialog } from "@/components/tasks/add-task-dialog"
import { TaskRow } from "@/components/tasks/task-row"
import { Button } from "@/components/ui/button"
import type { Task, TaskParent } from "@/lib/db/tasks"

export type TasksTarget =
  | { type: "deal"; dealId: string }
  | { type: "contact"; contactId: string }
  | { type: "company"; companyId: string }

function targetToParent(target: TasksTarget): TaskParent {
  switch (target.type) {
    case "deal":
      return { type: "deal", dealId: target.dealId }
    case "contact":
      return { type: "contact", contactId: target.contactId }
    case "company":
      return { type: "company", companyId: target.companyId }
  }
}

export function TasksSection({
  target,
  initialTasks,
}: {
  target: TasksTarget
  initialTasks: Task[]
}) {
  const [addOpen, setAddOpen] = useState(false)

  const open = initialTasks.filter((t) => t.completed_at === null)
  const done = initialTasks.filter((t) => t.completed_at !== null)
  const countLabel =
    initialTasks.length === 1 ? "1 Aufgabe" : `${initialTasks.length} Aufgaben`

  return (
    <section aria-labelledby="tasks-heading" className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 id="tasks-heading" className="text-base font-medium">
            Aufgaben
          </h3>
          <span className="text-xs text-muted-foreground">{countLabel}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Aufgabe hinzufügen
        </Button>
      </header>

      {initialTasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Noch keine Aufgaben. Füge die erste hinzu, um loszulegen.
        </p>
      ) : (
        <div className="space-y-2">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
          {done.length > 0 && open.length > 0 && (
            <hr className="my-3 border-border" />
          )}
          {done.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}

      <AddTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        fixedParent={targetToParent(target)}
      />
    </section>
  )
}
