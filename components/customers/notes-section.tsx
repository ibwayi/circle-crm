import { NoteForm } from "@/components/customers/note-form"
import { NoteItem } from "@/components/customers/note-item"
import type { Note } from "@/lib/db/notes"

export function NotesSection({
  customerId,
  notes,
}: {
  customerId: string
  notes: Note[]
}) {
  const countLabel = notes.length === 1 ? "1 note" : `${notes.length} notes`

  return (
    <section aria-labelledby="notes-heading" className="space-y-4">
      <header className="flex items-baseline gap-2">
        <h3 id="notes-heading" className="text-base font-medium">
          Notes
        </h3>
        <span className="text-xs text-muted-foreground">{countLabel}</span>
      </header>

      <NoteForm customerId={customerId} />

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. Add the first one above.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </div>
      )}
    </section>
  )
}
