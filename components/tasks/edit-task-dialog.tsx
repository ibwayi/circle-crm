"use client"

import {
  TaskForm,
  type TaskParentOption,
} from "@/components/tasks/task-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Task } from "@/lib/db/tasks"

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  parentOptions,
}: {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  // The parent picker is always shown on edit so users can re-assign a
  // task between Deal / Contact / Company / standalone. Pass the full
  // catalog from the page.
  parentOptions?: TaskParentOption[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Aufgabe bearbeiten</DialogTitle>
          <DialogDescription>
            Aktualisiere Titel, Fälligkeit oder Verknüpfung.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          // Reset form state when switching tasks.
          key={task.id}
          mode="edit"
          task={task}
          parentOptions={parentOptions}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
