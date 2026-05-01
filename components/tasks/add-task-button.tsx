"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { AddTaskDialog } from "@/components/tasks/add-task-dialog"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { Button } from "@/components/ui/button"

export function AddTaskButton({
  parentOptions,
  variant = "default",
  size = "default",
  label = "Aufgabe hinzufügen",
}: {
  parentOptions: TaskParentOption[]
  variant?: "default" | "outline"
  size?: "default" | "sm"
  label?: string
}) {
  const [open, setOpen] = useState(false)
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
      />
    </>
  )
}
