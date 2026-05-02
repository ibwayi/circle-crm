"use client"

import type { PipelineDealOption } from "@/components/tasks/pipeline-picker-modal"
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
  dealOptions,
}: {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  // Legacy thin catalog kept for ParentHint fallback resolution.
  parentOptions?: TaskParentOption[]
  // Rich deal catalog for the combobox + Pipeline modal. Pages with a
  // mounted EditTaskDialog must pass this so the dialog can resolve
  // "deal:<uuid>" to a real label and offer the visual picker.
  dealOptions?: PipelineDealOption[]
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
          dealOptions={dealOptions}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
