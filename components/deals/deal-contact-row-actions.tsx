"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Star, X } from "lucide-react"
import { toast } from "sonner"

import {
  setDealPrimaryContactAction,
  unlinkDealContactAction,
} from "@/app/(app)/deals/actions"
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
import { cn } from "@/lib/utils"

type Contact = {
  id: string
  first_name: string
  last_name: string | null
}

function fullName(c: Contact): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ")
}

export function DealContactRowActions({
  dealId,
  contact,
  isPrimary,
  currentPrimaryName,
}: {
  dealId: string
  contact: Contact
  isPrimary: boolean
  // Used in the "Set as primary" confirmation copy when there's an
  // existing primary that will be demoted. Null when there isn't one.
  currentPrimaryName: string | null
}) {
  const [setPrimaryOpen, setSetPrimaryOpen] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:focus-within:opacity-100">
        {!isPrimary && (
          <button
            type="button"
            onClick={() => setSetPrimaryOpen(true)}
            aria-label={`Set ${fullName(contact)} as primary contact`}
            title="Set as primary"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setUnlinkOpen(true)}
          aria-label={`Remove ${fullName(contact)} from this deal`}
          title="Remove from deal"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            "text-muted-foreground hover:bg-muted hover:text-destructive",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <SetPrimaryDialog
        dealId={dealId}
        contact={contact}
        currentPrimaryName={currentPrimaryName}
        open={setPrimaryOpen}
        onOpenChange={setSetPrimaryOpen}
      />
      <UnlinkDialog
        dealId={dealId}
        contact={contact}
        isPrimary={isPrimary}
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
      />
    </>
  )
}

function SetPrimaryDialog({
  dealId,
  contact,
  currentPrimaryName,
  open,
  onOpenChange,
}: {
  dealId: string
  contact: Contact
  currentPrimaryName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    const result = await setDealPrimaryContactAction(dealId, contact.id)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    toast.success("Primary contact updated")
    onOpenChange(false)
    startTransition(() => router.refresh())
  }

  const busy = submitting || pending
  const name = fullName(contact)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set {name} as primary?</AlertDialogTitle>
          <AlertDialogDescription>
            {currentPrimaryName
              ? `This will demote ${currentPrimaryName} — they'll stay linked to the deal as a regular contact.`
              : `${name} will become the primary contact for this deal.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={busy}
            className="min-w-[120px]"
          >
            {busy ? "Updating…" : "Set as primary"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function UnlinkDialog({
  dealId,
  contact,
  isPrimary,
  open,
  onOpenChange,
}: {
  dealId: string
  contact: Contact
  isPrimary: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm(event: React.MouseEvent) {
    event.preventDefault()
    setSubmitting(true)
    const result = await unlinkDealContactAction(dealId, contact.id)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    toast.success("Contact removed from deal")
    onOpenChange(false)
    startTransition(() => router.refresh())
  }

  const busy = submitting || pending
  const name = fullName(contact)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name} from this deal?</AlertDialogTitle>
          <AlertDialogDescription>
            {name}&apos;s record will not be deleted — only their connection to
            this deal goes away.
            {isPrimary && (
              <>
                {" "}
                Since they were the primary contact, this deal will be left
                without a primary until you set a new one.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={busy}
            className={cn(
              buttonVariants({ variant: "destructive" }),
              "min-w-[100px]"
            )}
          >
            {busy ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
