import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import type { Note } from "@/lib/db/notes"

export function NoteItem({ note }: { note: Note }) {
  return (
    <article className="group rounded-md border border-border bg-card p-4 transition-colors hover:border-border">
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
        {/* Delete trigger lands in T-7.3. */}
      </div>
    </article>
  )
}
