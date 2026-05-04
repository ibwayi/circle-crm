"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"

import { AddTaskDialog } from "@/components/tasks/add-task-dialog"
import type { PipelineDealOption } from "@/components/tasks/pipeline-picker-modal"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { Button } from "@/components/ui/button"

export function AddTaskButton({
  parentOptions,
  dealOptions,
  variant = "default",
  size = "default",
  label = "Aufgabe hinzufügen",
  initialOpen = false,
}: {
  parentOptions: TaskParentOption[]
  dealOptions: PipelineDealOption[]
  variant?: "default" | "outline"
  size?: "default" | "sm"
  label?: string
  // Phase 26.5: Cmd+K wires "Neue Aufgabe anlegen" to /tasks?new=true.
  // Page forwards as initialOpen; mount effect strips the param via
  // history.replaceState so a reload doesn't re-open the dialog.
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)

  useEffect(() => {
    if (!initialOpen) return
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.delete("new")
    window.history.replaceState(null, "", url.toString())
  }, [initialOpen])

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
