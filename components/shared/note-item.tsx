"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import type { NotesTarget } from "@/app/(app)/_actions/notes"
import { DeleteNoteDialog } from "@/components/shared/delete-note-dialog"
import type { Note } from "@/lib/db/notes"
import { cn } from "@/lib/utils"

export function NoteItem({
  note,
  target,
}: {
  note: Note
  target: NotesTarget
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)

  return (
    <>
      <article
        className={cn(
          "group rounded-md border border-border bg-card p-4 transition-opacity duration-150",
          pendingDelete && "pointer-events-none opacity-40"
        )}
      >
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {note.content}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <time
            dateTime={note.created_at}
            className="text-xs text-muted-foreground"
          >
            {formatDistanceToNow(new Date(note.created_at), {
              addSuffix: true,
              locale: de,
            })}
          </time>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete note"
            title="Delete note"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity",
              "text-muted-foreground hover:bg-muted hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </article>
      <DeleteNoteDialog
        noteId={note.id}
        target={target}
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setPendingDelete(false)
        }}
        onDeletePending={() => setPendingDelete(true)}
      />
    </>
  )
}
