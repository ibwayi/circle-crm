"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { format } from "date-fns"
import { toast } from "sonner"

import {
  createTaskAction,
  updateTaskAction,
  type TaskActionInput,
} from "@/app/(app)/_actions/tasks"
import { DealCombobox } from "@/components/shared/deal-combobox"
import {
  PipelinePickerModal,
  type PipelineDealOption,
} from "@/components/tasks/pipeline-picker-modal"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Task, TaskParent } from "@/lib/db/tasks"
import {
  TASK_PARENT_NONE,
  TASK_PRIORITIES,
  taskSchema,
  type TaskFormValues,
  type TaskPriorityValue,
} from "@/lib/validations/task"

type Mode = { mode: "create" } | { mode: "edit"; task: Task }

// Parent picker option. Lightweight shape used for the encoded
// "deal:<uuid>" / standalone-sentinel roundtrip. Phase 24.8 introduced
// the richer `dealOptions` prop (DealOption / PipelineDealOption) for
// the searchable combobox + modal — `parentOptions` is now mainly used
// by TaskRow's ParentHint as a fallback label resolver. New callers
// should prefer `dealOptions` directly.
export type TaskParentOption = {
  // The encoded string used as the form value.
  value: string
  // What the user sees as a label.
  label: string
  // Resolved back into a TaskParent for the action call.
  parent: TaskParent
}

// Read-only display context surfaced when the form is opened from a
// detail page. The page knows the entity's neighbours (the company a
// deal belongs to, the deal's primary contact, etc.) and passes them
// as hints — the user sees "this task will live on {Deal} at {Company}
// — primary contact: {Name}" without an extra fetch from the form.
//
// Display-only for now (Phase 24.6 spec option (a)). The task's only
// stored parent FK still comes from `fixedParent`. Persistent
// contact-focus is a future-phase decision.
export type TaskContext = {
  companyName?: string
  primaryContactName?: string
}

type Props = Mode & {
  // Fixed-parent mode: detail-page Add Task uses this. The picker is
  // hidden, the parent is implicit.
  fixedParent?: TaskParent
  // Free-parent mode: every Add/Edit Task entry point passes this so
  // the combobox + Pipeline modal can render real deal labels (title,
  // company, primary contact, value). Phase 24.8 replaced the flat
  // Select that previously used `parentOptions`.
  dealOptions?: PipelineDealOption[]
  // Legacy thin catalog kept for TaskRow's ParentHint fallback. Pages
  // that already pass dealOptions can omit this.
  parentOptions?: TaskParentOption[]
  // Display-only context shown below the parent picker (or in its
  // place when fixedParent is set). Optional — /tasks doesn't pass
  // anything; detail pages pass the entity's neighbours.
  context?: TaskContext
  onSuccess: (taskId: string) => void
  onCancel?: () => void
}

const PRIORITY_LABELS: Record<TaskPriorityValue, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
}

const EMPTY_VALUES: TaskFormValues = {
  title: "",
  notes: "",
  due_date: "",
  due_time: "",
  priority: "medium",
  parent_value: TASK_PARENT_NONE,
}

function taskToValues(task: Task): TaskFormValues {
  const parentValue =
    task.deal_id !== null ? `deal:${task.deal_id}` : TASK_PARENT_NONE
  return {
    title: task.title,
    notes: task.notes ?? "",
    due_date: task.due_date ?? "",
    due_time: task.due_time ? task.due_time.slice(0, 5) : "",
    priority: (task.priority as TaskPriorityValue) ?? "medium",
    parent_value: parentValue,
  }
}

// Same boundary translators the deal form uses — local-tz format on the
// way back, parseISO on the way in. Avoids the toISOString().slice trap.
function isoDateToDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
function dateToIsoDate(d: Date | null): string {
  return d ? format(d, "yyyy-MM-dd") : ""
}

function decodeParent(
  value: string,
  fallback: TaskParent,
  options?: TaskParentOption[]
): TaskParent {
  if (value === TASK_PARENT_NONE) return { type: "standalone" }
  if (options) {
    const match = options.find((o) => o.value === value)
    if (match) return match.parent
  }
  // Encoded "deal:<uuid>" — decode directly when no option list is given.
  const sep = value.indexOf(":")
  if (sep < 0) return fallback
  const type = value.slice(0, sep)
  const id = value.slice(sep + 1)
  if (type === "deal") return { type: "deal", dealId: id }
  return fallback
}

export function TaskForm(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  // Pipeline modal lives alongside the combobox — opened from the
  // combobox footer ("Pipeline-Ansicht öffnen"), closed on selection.
  const [pipelinePickerOpen, setPipelinePickerOpen] = useState(false)

  // Create-mode default: due_date prefills to today. Most tasks people
  // add are for "right now" or "today" — a smart prefill saves a click
  // and the user can clear it with the date picker if it doesn't apply.
  // Edit-mode preserves whatever the task already had (including null).
  const initialValues =
    props.mode === "edit"
      ? taskToValues(props.task)
      : { ...EMPTY_VALUES, due_date: format(new Date(), "yyyy-MM-dd") }

  const form = useForm<TaskFormValues>({
    resolver: standardSchemaResolver(taskSchema),
    defaultValues: initialValues,
  })

  // Date picker bounds — tasks can be due any time from now through five
  // years out. Past due dates aren't useful (you'd just leave the date
  // empty and complete the task once it's done). Memoised so the Date
  // references stay stable across renders.
  const dateBounds = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fiveYears = new Date(today)
    fiveYears.setFullYear(today.getFullYear() + 5)
    return { min: today, max: fiveYears }
  }, [])

  const showParentPicker = !props.fixedParent

  async function onSubmit(values: TaskFormValues) {
    setSubmitting(true)
    const parent = props.fixedParent
      ? props.fixedParent
      : decodeParent(
          values.parent_value,
          { type: "standalone" },
          props.parentOptions
        )

    // Postgres `time` accepts HH:mm or HH:mm:ss; we send HH:mm:00 so the
    // round-trip from the DB matches what we display.
    const dueTime = values.due_time.trim()
      ? `${values.due_time.trim()}:00`
      : null

    const input: TaskActionInput = {
      title: values.title,
      notes: values.notes,
      due_date: values.due_date,
      due_time: dueTime,
      priority: values.priority,
      parent,
    }

    const result =
      props.mode === "create"
        ? await createTaskAction(input)
        : await updateTaskAction(props.task.id, input)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Etwas ist schiefgelaufen", { description: result.error })
      return
    }

    toast.success(
      props.mode === "create" ? "Aufgabe erstellt" : "Änderungen gespeichert"
    )
    startTransition(() => {
      router.refresh()
    })
    props.onSuccess(result.taskId)
  }

  const busy = submitting || pending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titel</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder="z. B. Angebot nachfassen"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notiz (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  className="min-h-20 resize-none"
                  placeholder="Mehr Kontext, falls hilfreich…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fällig am</FormLabel>
                <FormControl>
                  <DatePicker
                    value={isoDateToDate(field.value)}
                    onChange={(d) => field.onChange(dateToIsoDate(d))}
                    minDate={dateBounds.min}
                    maxDate={dateBounds.max}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Uhrzeit (optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priorität</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      {/* Base UI's SelectValue defaults to displaying
                          the raw `value` of the matched item; we map
                          back to the German label here. Same pattern
                          as the source-dropdown fix in deal-form. */}
                      {(v: string | null) => {
                        if (v === null) return null
                        return (
                          PRIORITY_LABELS[v as TaskPriorityValue] ?? v
                        )
                      }}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {showParentPicker && (
          <FormField
            control={form.control}
            name="parent_value"
            render={({ field }) => {
              // The combobox roundtrips dealId | null. Translate to the
              // form's encoded `parent_value` shape on the way in/out.
              const dealId =
                field.value && field.value !== TASK_PARENT_NONE
                  ? field.value.startsWith("deal:")
                    ? field.value.slice("deal:".length)
                    : null
                  : null

              const handleDealChange = (next: string | null): void => {
                field.onChange(next ? `deal:${next}` : TASK_PARENT_NONE)
              }

              return (
                <FormItem>
                  <FormLabel>Verknüpft mit</FormLabel>
                  <FormControl>
                    <DealCombobox
                      value={dealId}
                      onChange={handleDealChange}
                      deals={props.dealOptions ?? []}
                      onOpenPipelineView={
                        // Only offer the modal entry point if there are
                        // enough deals that a visual scan makes sense.
                        // Below the threshold the combobox itself is the
                        // faster path.
                        (props.dealOptions?.length ?? 0) >= 6
                          ? () => setPipelinePickerOpen(true)
                          : undefined
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: hänge diese Aufgabe an einen Deal — oder
                    lass sie eigenständig.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        )}

        {/* Pipeline modal mounted alongside the combobox. Stays out of
            the DOM until the user explicitly opens it; selecting a deal
            flows back through the form's setValue. */}
        {showParentPicker && props.dealOptions && (
          <PipelinePickerModal
            open={pipelinePickerOpen}
            onOpenChange={setPipelinePickerOpen}
            deals={props.dealOptions}
            onSelect={(dealId) => {
              form.setValue("parent_value", `deal:${dealId}`, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          />
        )}

        {/* Detail-page context block — read-only hints about the
            entity's neighbours so the user knows what the task is
            "really about." Skipped if no useful fields are present. */}
        {props.context &&
          (props.context.companyName || props.context.primaryContactName) && (
            <div className="space-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {props.context.companyName && (
                <div>
                  Firma:{" "}
                  <span className="text-foreground">
                    {props.context.companyName}
                  </span>
                </div>
              )}
              {props.context.primaryContactName && (
                <div>
                  Hauptkontakt:{" "}
                  <span className="text-foreground">
                    {props.context.primaryContactName}
                  </span>
                </div>
              )}
            </div>
          )}

        <div className="flex items-center justify-end gap-2 pt-2">
          {props.onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={props.onCancel}
              disabled={busy}
            >
              Abbrechen
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? props.mode === "create"
                ? "Erstellen…"
                : "Speichern…"
              : props.mode === "create"
                ? "Aufgabe erstellen"
                : "Änderungen speichern"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
