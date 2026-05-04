"use client"

import type { PipelineDealOption } from "@/components/tasks/pipeline-picker-modal"
import type { TaskParentOption } from "@/components/tasks/task-form"
import { TaskBulkActions } from "@/components/tasks/task-bulk-actions"
import { TaskRow } from "@/components/tasks/task-row"
import { useSelection } from "@/lib/hooks/use-selection"
import type { Task, TaskDealContext } from "@/lib/db/tasks"

/**
 * Client wrapper that owns multi-select state for the /tasks page.
 * Mounts the bulk action bar alongside the rows. Server-rendered
 * tabs (today/overdue/upcoming/completed) just pass their tasks +
 * dealContexts here; selection lives entirely client-side.
 */
export function TasksList({
  tasks,
  parentOptions,
  dealOptions,
  dealContexts,
}: {
  tasks: Task[]
  parentOptions: TaskParentOption[]
  dealOptions: PipelineDealOption[]
  dealContexts: Map<string, TaskDealContext>
}) {
  const visibleIds = tasks.map((t) => t.id)
  const selection = useSelection(visibleIds)

  return (
    <>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            parentOptions={parentOptions}
            dealOptions={dealOptions}
            showParentHint
            dealContext={
              task.deal_id ? dealContexts.get(task.deal_id) ?? null : null
            }
            selection={{
              isSelected: selection.isSelected,
              toggle: selection.toggle,
            }}
          />
        ))}
      </div>
      <TaskBulkActions
        selectedIds={selection.selected}
        visibleTasks={tasks}
        onClear={selection.clear}
      />
    </>
  )
}
