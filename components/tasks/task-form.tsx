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

// Parent picker option. The form picker is a single Select; each option
// holds an "encoded" string `${type}:${id}` (or the standalone sentinel)
// so the Select can roundtrip a single value.
export type TaskParentOption = {
  // The encoded string used as the SelectItem value.
  value: string
  // What the user sees in the trigger and the listbox.
  label: string
  // Resolved back into a TaskParent for the action call.
  parent: TaskParent
}

type Props = Mode & {
  // Fixed-parent mode: detail-page Add Task uses this. The picker is
  // hidden, the parent is implicit.
  fixedParent?: TaskParent
  // Free-parent mode: /tasks Add Task uses this. The picker shows
  // every option (standalone + each Deal / Contact / Company).
  parentOptions?: TaskParentOption[]
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
    task.deal_id !== null
      ? `deal:${task.deal_id}`
      : task.contact_id !== null
        ? `contact:${task.contact_id}`
        : task.company_id !== null
          ? `company:${task.company_id}`
          : TASK_PARENT_NONE
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
  // Encoded "type:id" — decode directly when no option list is given.
  const sep = value.indexOf(":")
  if (sep < 0) return fallback
  const type = value.slice(0, sep)
  const id = value.slice(sep + 1)
  if (type === "deal") return { type: "deal", dealId: id }
  if (type === "contact") return { type: "contact", contactId: id }
  if (type === "company") return { type: "company", companyId: id }
  return fallback
}

export function TaskForm(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const initialValues =
    props.mode === "edit" ? taskToValues(props.task) : EMPTY_VALUES

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
                    <SelectValue />
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verknüpft mit</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={TASK_PARENT_NONE}>
                      <span className="italic text-muted-foreground">
                        Keine Verknüpfung (persönliche Aufgabe)
                      </span>
                    </SelectItem>
                    {(props.parentOptions ?? []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Optional: hänge diese Aufgabe an einen Deal, Kontakt oder
                  eine Firma — oder lass sie eigenständig.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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
