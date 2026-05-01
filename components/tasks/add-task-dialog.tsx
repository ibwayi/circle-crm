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
import type { TaskParent } from "@/lib/db/tasks"

export function AddTaskDialog({
  open,
  onOpenChange,
  fixedParent,
  parentOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // When set, the parent picker is hidden and the task is created with
  // this parent. Used from Deal/Contact/Company detail pages.
  fixedParent?: TaskParent
  // When set (and fixedParent is not), the picker is shown with these
  // options. Used from /tasks.
  parentOptions?: TaskParentOption[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Aufgabe hinzufügen</DialogTitle>
          <DialogDescription>
            Erstelle eine Aufgabe oder Erinnerung. Du kannst die Details
            später jederzeit anpassen.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          mode="create"
          fixedParent={fixedParent}
          parentOptions={parentOptions}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
