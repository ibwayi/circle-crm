"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { toast } from "sonner"

import { bulkDeleteCompaniesAction } from "@/app/(app)/companies/actions"
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
import type { CompanyWithCounts } from "@/lib/db/companies"
import { exportToCsv } from "@/lib/utils/csv"
import { cn } from "@/lib/utils"

export function CompanyBulkActions({
  selectedIds,
  visibleCompanies,
  onClear,
}: {
  selectedIds: ReadonlySet<string>
  visibleCompanies: CompanyWithCounts[]
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
    const result = await bulkDeleteCompaniesAction(ids)
    setBusy(false)
    setConfirmDeleteOpen(false)
    if (!result.ok) {
      toast.error("Konnte nicht löschen", { description: result.error })
      return
    }
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Firma" : "Firmen"} gelöscht`
    )
    onClear()
    startTransition(() => router.refresh())
  }

  function handleExport(): void {
    const rows = visibleCompanies.filter((c) => selectedIds.has(c.id))
    const today = format(new Date(), "yyyy-MM-dd", { locale: de })
    exportToCsv(rows, `circle-companies-${today}.csv`, [
      { key: "name", label: "Name" },
      { key: "industry", label: "Branche" },
      { key: "website", label: "Website" },
      { key: "email", label: "E-Mail" },
      { key: "phone", label: "Telefon" },
      { key: "address", label: "Adresse" },
      { key: "size_range", label: "Größe" },
      { key: "contact_count", label: "Kontakte" },
      { key: "active_deal_count", label: "Aktive Deals" },
      { key: "created_at", label: "Erstellt am" },
      { key: "updated_at", label: "Zuletzt aktualisiert" },
    ])
    toast.success(
      `${rows.length} ${rows.length === 1 ? "Firma" : "Firmen"} exportiert`
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
              {count} {count === 1 ? "Firma" : "Firmen"} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die Firmen werden dauerhaft entfernt. Verknüpfte Kontakte
              und Deals bleiben erhalten, ihre Firmen-Verknüpfung wird
              auf „keine Firma“ gesetzt.
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
