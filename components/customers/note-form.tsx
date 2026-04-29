"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"

import { addNoteAction } from "@/app/(app)/customers/actions"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { noteSchema, type NoteFormValues } from "@/lib/validations/note"

export function NoteForm({ customerId }: { customerId: string }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [pending, startTransition] = useTransition()

  const form = useForm<NoteFormValues>({
    resolver: standardSchemaResolver(noteSchema),
    defaultValues: { content: "" },
  })

  // watch() re-renders on every keystroke — fine here since we're only using
  // it to disable the submit button. The textarea itself is uncontrolled
  // through react-hook-form so this doesn't double-render the input.
  const trimmed = form.watch("content").trim()
  const canSubmit = trimmed.length > 0

  async function onSubmit(values: NoteFormValues) {
    setSubmitting(true)
    const result = await addNoteAction(customerId, values.content)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    toast.success("Note added")
    form.reset({ content: "" })
    startTransition(() => router.refresh())
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd+Return on macOS, Ctrl+Return on Windows/Linux. handleSubmit runs
    // validation first, so the shortcut respects the same canSubmit gate.
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      void form.handleSubmit(onSubmit)()
    }
  }

  const busy = submitting || pending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Add a note..."
                  rows={3}
                  className="min-h-20 max-h-40 resize-none"
                  onKeyDown={handleKeyDown}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
              ⌘
            </kbd>{" "}
            +{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
              Return
            </kbd>{" "}
            to add
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit || busy}
          >
            {busy ? "Adding…" : "Add note"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
