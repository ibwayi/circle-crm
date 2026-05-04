"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { toast } from "sonner"

import { bulkDeleteContactsAction } from "@/app/(app)/contacts/actions"
import { BulkActionBar } from "@/components/shared/bulk-action-bar"
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
import { buttonVariants } from "@/components/ui/button"
import type { ContactWithCounts } from "@/lib/db/contacts"
import { exportToCsv } from "@/lib/utils/csv"
import { cn } from "@/lib/utils"

export function ContactBulkActions({
  selectedIds,
  visibleContacts,
  onClear,
}: {
  selectedIds: ReadonlySet<string>
  visibleContacts: ContactWithCounts[]
  onClear: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ids = Array.from(selectedIds)
  const count = ids.length

  async function handleDeleteConfirm(): Promise<void> {
    setBusy(true)
    const result = await bulkDeleteContactsAction(ids)
    setBusy(false)
    setConfirmDeleteOpen(false)
    if (!result.ok) {
      toast.error("Konnte nicht löschen", { description: result.error })
      return
    }
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Kontakt" : "Kontakte"} gelöscht`
    )
    onClear()
    startTransition(() => router.refresh())
  }

  function handleExport(): void {
    const rows = visibleContacts.filter((c) => selectedIds.has(c.id))
    const today = format(new Date(), "yyyy-MM-dd", { locale: de })
    exportToCsv(rows, `circle-contacts-${today}.csv`, [
      { key: "first_name", label: "Vorname" },
      { key: "last_name", label: "Nachname" },
      { key: "email", label: "E-Mail" },
      { key: "phone", label: "Telefon" },
      { key: "position", label: "Position" },
      { key: (row) => row.company?.name ?? "", label: "Firma" },
      { key: "linkedin_url", label: "LinkedIn" },
      { key: "active_deal_count", label: "Aktive Deals" },
      { key: "created_at", label: "Erstellt am" },
      { key: "updated_at", label: "Zuletzt aktualisiert" },
    ])
    toast.success(
      `${rows.length} ${rows.length === 1 ? "Kontakt" : "Kontakte"} exportiert`
    )
  }

  return (
    <>
      <BulkActionBar
        selectedCount={count}
        onClear={onClear}
        actions={[
          {
            id: "export",
            label: "CSV",
            icon: Download,
            disabled: busy,
            onClick: handleExport,
          },
          {
            id: "delete",
            label: "Löschen",
            icon: Trash2,
            variant: "destructive",
            disabled: busy,
            onClick: () => setConfirmDeleteOpen(true),
          },
        ]}
      />
      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {count} {count === 1 ? "Kontakt" : "Kontakte"} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die Kontakte werden dauerhaft entfernt. Verknüpfte Deals
              und Notizen bleiben erhalten, aber die Verknüpfung zu
              diesen Kontakten geht verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteConfirm()
              }}
              disabled={busy}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "min-w-[100px]"
              )}
            >
              {busy ? "Lösche…" : `${count} löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
