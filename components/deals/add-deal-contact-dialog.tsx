"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { linkDealContactAction } from "@/app/(app)/deals/actions"
import {
  ContactCombobox,
  type ContactOption,
} from "@/components/shared/contact-combobox"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function AddDealContactDialog({
  dealId,
  dealCompanyId,
  contacts,
  currentPrimary,
  open,
  onOpenChange,
}: {
  dealId: string
  dealCompanyId: string | null
  contacts: ContactOption[]
  // Current primary contact (or null) — used to warn the user when checking
  // "Set as primary" would demote someone.
  currentPrimary: { id: string; first_name: string; last_name: string | null } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [contactId, setContactId] = useState<string | null>(null)
  const [setAsPrimary, setSetAsPrimary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset local state when closing so a re-open starts fresh.
      setContactId(null)
      setSetAsPrimary(false)
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!contactId) {
      setError("Pick a contact.")
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await linkDealContactAction(dealId, contactId, setAsPrimary)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    toast.success("Contact linked")
    handleOpenChange(false)
    startTransition(() => router.refresh())
  }

  const busy = submitting || pending

  const primaryName = currentPrimary
    ? [currentPrimary.first_name, currentPrimary.last_name]
        .filter(Boolean)
        .join(" ")
    : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Link contact</DialogTitle>
          <DialogDescription>
            Add an existing contact to this deal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-picker">Contact</Label>
            <ContactCombobox
              value={contactId}
              onChange={(v) => {
                setContactId(v)
                if (v) setError(null)
              }}
              contacts={contacts}
              scopeCompanyId={dealCompanyId}
              placeholder="Select contact…"
              noneLabel="(Clear)"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="set-as-primary"
              type="checkbox"
              checked={setAsPrimary}
              onChange={(e) => setSetAsPrimary(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border border-input accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="grid gap-1">
              <label
                htmlFor="set-as-primary"
                className="cursor-pointer text-sm font-medium leading-none"
              >
                Set as primary contact for this deal
              </label>
              {setAsPrimary && primaryName && (
                <p className="text-xs text-muted-foreground">
                  This will replace{" "}
                  <strong className="text-foreground">{primaryName}</strong>{" "}
                  as the primary contact.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !contactId}>
              {busy ? "Linking…" : "Link contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
