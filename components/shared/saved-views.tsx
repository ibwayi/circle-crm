"use client"

import { useMemo, useState, useTransition } from "react"
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import {
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  createSavedViewAction,
  deleteSavedViewAction,
  updateSavedViewAction,
} from "@/app/(app)/_actions/saved-views"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SavedView, SavedViewEntity } from "@/lib/db/saved-views"
import { cn } from "@/lib/utils"

/**
 * Saved-views surface: a "Speichern" button + a "Gespeicherte
 * Ansichten" dropdown, side-by-side. Mounted in each entity list
 * page's filter row.
 *
 * Save flow:
 *   1. Read current URL searchParams via useSearchParams.
 *   2. Strip sort/dir into a separate `sort` payload; everything
 *      else goes to `filters`.
 *   3. Open the Speichern dialog → user types a name → server action
 *      creates the row → toast → router.refresh picks up the new
 *      view in the dropdown next render.
 *
 * Apply flow:
 *   1. User picks a view from the dropdown.
 *   2. Reconstruct URL params from view.filters + view.sort.
 *   3. router.replace(`${pathname}?${params}`) — same client-side
 *      navigation the entity's filter UI uses for ad-hoc changes.
 *
 * Edit/delete:
 *   * Pencil icon next to each item opens a rename dialog.
 *   * Trash icon opens a confirm AlertDialog.
 *   * Both icons sit on the right side of each dropdown item;
 *     hover-only on desktop (focus-visible too), always visible on
 *     mobile (no hover state).
 */
export function SavedViews({
  entity,
  views,
  sortKeys = [],
}: {
  entity: SavedViewEntity
  views: SavedView[]
  /**
   * URL params that should be encoded into the `sort` JSONB rather
   * than `filters`. /deals passes ["sort", "dir"]; other entities
   * pass [] (their pages don't expose column-sort yet). Keeping this
   * as a per-page hint avoids hardcoding deal-specific behaviour
   * inside the saved-views component.
   */
  sortKeys?: readonly string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [saveOpen, setSaveOpen] = useState(false)
  const [editing, setEditing] = useState<SavedView | null>(null)
  const [deleting, setDeleting] = useState<SavedView | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState("")

  // Active filter count: every URL param except sort/dir contributes
  // (sort doesn't count as a "filter" in user terms — switching sort
  // direction shouldn't pulse the save button).
  const activeFilterCount = useMemo(() => {
    let count = 0
    for (const [key] of searchParams.entries()) {
      if (sortKeys.includes(key)) continue
      count++
    }
    return count
  }, [searchParams, sortKeys])

  function buildPayload() {
    const filters: Record<string, string> = {}
    let sort: { key: string; dir: "asc" | "desc" } | null = null
    let sortKey: string | null = null
    let sortDir: string | null = null
    for (const [key, value] of searchParams.entries()) {
      if (key === "sort") {
        sortKey = value
        continue
      }
      if (key === "dir") {
        sortDir = value
        continue
      }
      if (sortKeys.includes(key)) {
        // Caller declared this key belongs in `sort`, but we don't
        // know its semantics here. Skip silently — only sort/dir
        // are honored as the canonical sort container.
        continue
      }
      filters[key] = value
    }
    if (sortKey && (sortDir === "asc" || sortDir === "desc")) {
      sort = { key: sortKey, dir: sortDir }
    }
    return { filters, sort }
  }

  async function handleSave(): Promise<void> {
    if (name.trim().length === 0) {
      toast.error("Name ist erforderlich")
      return
    }
    setBusy(true)
    const { filters, sort } = buildPayload()
    const result = await createSavedViewAction({
      entity,
      name: name.trim(),
      filters,
      sort,
    })
    setBusy(false)
    if (!result.ok) {
      toast.error("Konnte nicht speichern", { description: result.error })
      return
    }
    toast.success(`Ansicht „${result.view.name}“ gespeichert`)
    setName("")
    setSaveOpen(false)
    startTransition(() => router.refresh())
  }

  async function handleRename(): Promise<void> {
    if (!editing) return
    if (name.trim().length === 0) {
      toast.error("Name ist erforderlich")
      return
    }
    setBusy(true)
    const result = await updateSavedViewAction(editing.id, {
      name: name.trim(),
      entity,
    })
    setBusy(false)
    if (!result.ok) {
      toast.error("Konnte nicht umbenennen", { description: result.error })
      return
    }
    toast.success("Ansicht umbenannt")
    setName("")
    setEditing(null)
    startTransition(() => router.refresh())
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setBusy(true)
    const result = await deleteSavedViewAction(deleting.id, entity)
    setBusy(false)
    setDeleting(null)
    if (!result.ok) {
      toast.error("Konnte nicht löschen", { description: result.error })
      return
    }
    toast.success("Ansicht gelöscht")
    startTransition(() => router.refresh())
  }

  function handleApply(view: SavedView): void {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(view.filters)) {
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value)
      }
    }
    if (view.sort) {
      params.set("sort", view.sort.key)
      params.set("dir", view.sort.dir)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    toast.success(`Ansicht „${view.name}“ angewendet`)
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setName("")
            setSaveOpen(true)
          }}
          disabled={activeFilterCount === 0}
          title={
            activeFilterCount === 0
              ? "Setze zuerst Filter, um sie zu speichern"
              : "Aktuelle Filter als Ansicht speichern"
          }
        >
          <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Speichern</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5"
            )}
            disabled={views.length === 0}
            aria-label="Gespeicherte Ansichten"
            title={
              views.length === 0
                ? "Noch keine gespeicherten Ansichten"
                : "Gespeicherte Ansichten"
            }
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">
              Ansichten {views.length > 0 && `(${views.length})`}
            </span>
            <ChevronDown
              className="h-3 w-3 opacity-50"
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* Plain styled div for the heading — DropdownMenuLabel
                wraps Base UI's Menu.GroupLabel which crashes (#31)
                outside a Menu.Group. The user-menu uses the same
                pattern for its "Signed in as" row. */}
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Gespeicherte Ansichten
            </div>
            <DropdownMenuSeparator />
            {views.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Noch keine gespeichert.
              </div>
            ) : (
              views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="group/saved-view flex items-center gap-1"
                  onClick={() => handleApply(view)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {view.name}
                  </span>
                  {/* Edit + delete icons live next to each item.
                      Hover-only on desktop (less clutter); always
                      visible on touch via aria-focus. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing(view)
                      setName(view.name)
                    }}
                    aria-label={`Ansicht „${view.name}“ umbenennen`}
                    title="Umbenennen"
                    className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover/saved-view:opacity-100 md:focus-visible:opacity-100"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleting(view)
                    }}
                    aria-label={`Ansicht „${view.name}“ löschen`}
                    title="Löschen"
                    className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-destructive md:opacity-0 md:group-hover/saved-view:opacity-100 md:focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ansicht speichern</DialogTitle>
            <DialogDescription>
              Speichert die aktuellen Filter (
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "Filter" : "Filter"}) unter
              einem Namen.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSave()
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="saved-view-name">Name</Label>
              <Input
                id="saved-view-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Hochpriorisiert Q4"
                maxLength={80}
                autoComplete="off"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSaveOpen(false)}
                disabled={busy}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={busy || name.trim().length === 0}>
                {busy ? "Speichere…" : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ansicht umbenennen</DialogTitle>
            <DialogDescription>
              Filter und Sortierung bleiben unverändert.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleRename()
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="saved-view-rename">Name</Label>
              <Input
                id="saved-view-rename"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoComplete="off"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={busy || name.trim().length === 0}>
                {busy ? "Speichere…" : "Umbenennen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ansicht „{deleting?.name}“ löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die gespeicherten Filter werden entfernt. Das kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={busy}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "min-w-[100px]"
              )}
            >
              {busy ? "Lösche…" : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
