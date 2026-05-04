"use client"

import { Plus } from "lucide-react"

import { AddTaskDialog } from "@/components/tasks/add-task-dialog"
import type { PipelineDealOption } from "@/components/tasks/pipeline-picker-modal"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { Button } from "@/components/ui/button"
import { useAutoOpenFromQuery } from "@/lib/hooks/use-auto-open-from-query"

export function AddTaskButton({
  parentOptions,
  dealOptions,
  variant = "default",
  size = "default",
  label = "Aufgabe hinzufügen",
}: {
  parentOptions: TaskParentOption[]
  dealOptions: PipelineDealOption[]
  variant?: "default" | "outline"
  size?: "default" | "sm"
  label?: string
}) {
  // See lib/hooks/use-auto-open-from-query — Cmd+K wires /tasks?new=true
  // here for cross-route AND same-route nav.
  const { open, setOpen } = useAutoOpenFromQuery("new")

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <AddTaskDialog
        open={open}
        onOpenChange={setOpen}
        parentOptions={parentOptions}
        dealOptions={dealOptions}
      />
    </>
  )
}
