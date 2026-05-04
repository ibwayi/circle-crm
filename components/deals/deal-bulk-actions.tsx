"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { toast } from "sonner"

import {
  bulkDeleteDealsAction,
  bulkUpdateDealsStageAction,
} from "@/app/(app)/deals/actions"
import { STAGE_CONFIG, STAGE_ORDER } from "@/components/deals/stage-badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DealStage, DealWithRelations } from "@/lib/db/deals"
import { exportToCsv } from "@/lib/utils/csv"
import { cn } from "@/lib/utils"

const STAGE_PLACEHOLDER = "__pick__"

/**
 * Bulk-action surface for the Deals table:
 *   * Stage ändern Select (slotted into the BulkActionBar's children)
 *   * CSV export — client-side, scoped to the selected rows
 *   * Delete — destructive, confirmed via AlertDialog
 *
 * The Select uses a placeholder value so it appears unselected on
 * mount and resets after each successful change.
 */
export function DealBulkActions({
  selectedIds,
  visibleDeals,
  onClear,
}: {
  selectedIds: ReadonlySet<string>
  visibleDeals: DealWithRelations[]
  onClear: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stageValue, setStageValue] = useState<string>(STAGE_PLACEHOLDER)
  const ids = Array.from(selectedIds)
  const count = ids.length

  async function handleStageChange(stage: DealStage): Promise<void> {
    setBusy(true)
    const result = await bulkUpdateDealsStageAction(ids, stage)
    setBusy(false)
    setStageValue(STAGE_PLACEHOLDER)
    if (!result.ok) {
      toast.error("Konnte nicht aktualisiert werden", {
        description: result.error,
      })
      return
    }
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Deal" : "Deals"} auf "${STAGE_CONFIG[stage].label}" gesetzt`
    )
    onClear()
    startTransition(() => router.refresh())
  }

  async function handleDeleteConfirm(): Promise<void> {
    setBusy(true)
    const result = await bulkDeleteDealsAction(ids)
    setBusy(false)
    setConfirmDeleteOpen(false)
    if (!result.ok) {
      toast.error("Konnte nicht löschen", { description: result.error })
      return
    }
    toast.success(
      `${result.affected} ${result.affected === 1 ? "Deal" : "Deals"} gelöscht`
    )
    onClear()
    startTransition(() => router.refresh())
  }

  function handleExport(): void {
    const rows = visibleDeals.filter((d) => selectedIds.has(d.id))
    const today = format(new Date(), "yyyy-MM-dd", { locale: de })
    exportToCsv(rows, `circle-deals-${today}.csv`, [
      { key: "title", label: "Titel" },
      { key: (row) => row.company?.name ?? "", label: "Firma" },
      {
        key: (row) => {
          const c = row.primary_contact
          if (!c) return ""
          return [c.first_name, c.last_name].filter(Boolean).join(" ")
        },
        label: "Hauptkontakt",
      },
      {
        key: (row) => STAGE_CONFIG[row.stage as DealStage].label,
        label: "Stufe",
      },
      { key: "value_eur", label: "Wert (EUR)" },
      { key: "expected_close_date", label: "Erwarteter Abschluss" },
      { key: "source", label: "Quelle" },
      { key: "priority", label: "Priorität" },
      { key: "created_at", label: "Erstellt am" },
      { key: "updated_at", label: "Zuletzt aktualisiert" },
    ])
    toast.success(
      `${rows.length} ${rows.length === 1 ? "Deal" : "Deals"} exportiert`
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
      >
        <Select
          value={stageValue}
          onValueChange={(v) => {
            if (v === null || v === STAGE_PLACEHOLDER) return
            setStageValue(v)
            void handleStageChange(v as DealStage)
          }}
          disabled={busy}
        >
          <SelectTrigger
            className="h-7 w-[160px] cursor-pointer text-xs"
            disabled={busy}
          >
            <SelectValue>
              {(v: string | null) => {
                if (!v || v === STAGE_PLACEHOLDER) return "Stage ändern…"
                const cfg = STAGE_CONFIG[v as DealStage]
                return cfg ? cfg.label : v
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STAGE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </BulkActionBar>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {count} {count === 1 ? "Deal" : "Deals"} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die Deals werden dauerhaft entfernt. Verknüpfte Kontakte
              und Notizen bleiben erhalten, aber die Verknüpfung zu
              diesen Deals geht verloren.
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
