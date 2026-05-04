"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateUserPreferencesAction } from "@/app/(app)/_actions/user-preferences"
import { AvatarUpload } from "@/components/profile/avatar-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  PREFERENCE_STORAGE_KEYS,
  PREFERENCES_CHANGED_EVENT,
} from "@/lib/constants"
import type {
  DefaultDealView,
  UserPreferences,
} from "@/lib/db/user-preferences"
import { STALE_THRESHOLD_DEFAULT_DAYS } from "@/lib/utils/stale"

const VIEW_OPTIONS: { value: DefaultDealView; label: string }[] = [
  { value: "table", label: "Tabelle" },
  { value: "groups", label: "Gruppen" },
  { value: "kanban", label: "Kanban" },
]

/**
 * The profile form is the user's single editing surface for
 * `user_preferences`. Avatar upload is a separate concern delegated
 * to `<AvatarUpload>` (it manages its own optimistic state +
 * Supabase Storage round-trip); the form handles only the
 * text/select/number fields.
 *
 * First-time-user contract: `preferences` is null when the row
 * doesn't exist yet. The form renders the same defaults as
 * `getEffectivePreferences` would compute server-side — display name
 * defaults to the email's local-part, default view defaults to
 * "table", stale threshold to 7. The first save creates the row.
 *
 * The form is sparse: only fields the user actually changed get
 * sent. Helper-side `upsertUserPreferences` then leaves untouched
 * columns alone.
 */
export function ProfileForm({
  userId,
  email,
  preferences,
}: {
  userId: string
  email: string
  preferences: UserPreferences | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const emailLocalPart = email.split("@")[0] ?? ""

  const [displayName, setDisplayName] = useState<string>(
    preferences?.display_name ?? emailLocalPart
  )
  const [defaultView, setDefaultView] = useState<DefaultDealView>(
    (preferences?.default_deal_view as DefaultDealView | null) ?? "table"
  )
  const [staleThreshold, setStaleThreshold] = useState<string>(
    String(
      preferences?.stale_threshold_days ?? STALE_THRESHOLD_DEFAULT_DAYS
    )
  )

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)

    const thresholdNum = parseInt(staleThreshold, 10)
    if (!Number.isFinite(thresholdNum) || thresholdNum < 1 || thresholdNum > 365) {
      toast.error("Schwelle ungültig", {
        description: "Bitte eine Zahl zwischen 1 und 365 eingeben.",
      })
      setSubmitting(false)
      return
    }

    const result = await updateUserPreferencesAction({
      displayName: displayName.trim() || null,
      defaultDealView: defaultView,
      staleThresholdDays: thresholdNum,
    })
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Speichern fehlgeschlagen", { description: result.error })
      return
    }

    // Phase 29 fix: explicit save in /profile must override any
    // stale per-device localStorage value. Clear the matching keys
    // synchronously, then dispatch the event so any currently-mounted
    // hooks re-read their snapshot. Pages visited later (e.g. /deals
    // after navigation from /profile) will read empty localStorage and
    // fall through to the freshly-saved server preference.
    try {
      for (const key of PREFERENCE_STORAGE_KEYS) {
        window.localStorage.removeItem(key)
      }
    } catch {
      // Ignore quota / privacy-mode errors — server preference is
      // authoritative either way once localStorage is unreachable.
    }
    window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT))

    toast.success("Profil aktualisiert")
    startTransition(() => {
      router.refresh()
    })
  }

  function handleViewChange(arr: string[]): void {
    const next = arr[0] as DefaultDealView | undefined
    if (next === "table" || next === "groups" || next === "kanban") {
      setDefaultView(next)
    }
  }

  const busy = submitting || pending

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">Avatar</h2>
          <p className="text-sm text-muted-foreground">
            Wird in der Seitenleiste und im Konto-Menü angezeigt.
          </p>
        </div>
        <AvatarUpload
          userId={userId}
          initialUrl={preferences?.avatar_url ?? null}
          fallbackInitial={emailLocalPart.charAt(0) || "?"}
        />
      </section>

      <hr className="border-border" />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">Anzeige</h2>
          <p className="text-sm text-muted-foreground">
            Wie dein Name in der App erscheint.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Anzeigename</Label>
          <Input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={emailLocalPart}
            maxLength={80}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Standard: lokaler Teil deiner E-Mail-Adresse ({emailLocalPart}).
          </p>
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">Pipeline-Standardansicht</h2>
          <p className="text-sm text-muted-foreground">
            Welche Ansicht beim Öffnen von /deals zuerst geladen wird.
            Eine andere Wahl auf diesem Gerät überschreibt die Einstellung
            lokal.
          </p>
        </div>
        <ToggleGroup
          value={[defaultView]}
          onValueChange={handleViewChange}
          aria-label="Standardansicht für die Pipeline"
        >
          {VIEW_OPTIONS.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.value}>
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <hr className="border-border" />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">
            Schwellenwert für vernachlässigte Deals
          </h2>
          <p className="text-sm text-muted-foreground">
            Anzahl Tage ohne Aktivität, ab denen ein Deal als
            vernachlässigt gilt. Standard: {STALE_THRESHOLD_DEFAULT_DAYS}{" "}
            Tage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="stale-threshold"
            type="number"
            min={1}
            max={365}
            value={staleThreshold}
            onChange={(e) => setStaleThreshold(e.target.value)}
            className="w-24"
            inputMode="numeric"
          />
          <span className="text-sm text-muted-foreground">Tage</span>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Speichere…" : "Speichern"}
        </Button>
      </div>
    </form>
  )
}
