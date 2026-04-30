import type { NotesTarget } from "@/app/(app)/_actions/notes"
import { NoteForm } from "@/components/shared/note-form"
import { NoteItem } from "@/components/shared/note-item"
import type { Note } from "@/lib/db/notes"

export function NotesSection({
  target,
  initialNotes,
}: {
  target: NotesTarget
  initialNotes: Note[]
}) {
  const countLabel =
    initialNotes.length === 1 ? "1 note" : `${initialNotes.length} notes`

  return (
    <section aria-labelledby="notes-heading" className="space-y-4">
      <header className="flex items-baseline gap-2">
        <h3 id="notes-heading" className="text-base font-medium">
          Notes
        </h3>
        <span className="text-xs text-muted-foreground">{countLabel}</span>
      </header>

      <NoteForm target={target} />

      {initialNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. Add the first one above.
        </p>
      ) : (
        <div className="space-y-3">
          {initialNotes.map((note) => (
            <NoteItem key={note.id} note={note} target={target} />
          ))}
        </div>
      )}
    </section>
  )
}
