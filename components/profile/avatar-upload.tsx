"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { updateUserPreferencesAction } from "@/app/(app)/_actions/user-preferences"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_SIZE_BYTES,
  AVATAR_MAX_SIZE_LABEL,
  type AvatarAllowedMime,
} from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const EXT_BY_MIME: Record<AvatarAllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/**
 * Avatar editor: file picker + drag-drop + preview + remove.
 *
 * Upload flow:
 *   1. User picks/drops a file.
 *   2. Client validates size (≤2 MB) and MIME (jpeg/png/webp).
 *      Mirrors the Supabase bucket policy so we fail fast in the
 *      browser instead of waiting for the upload to error.
 *   3. Direct upload via the Supabase browser client to
 *      `avatars/{userId}/avatar.{ext}` — RLS on storage.objects
 *      scopes writes to the user's folder, so no server action is
 *      needed for the bytes themselves.
 *   4. The resulting public URL is written back to
 *      user_preferences.avatar_url via updateUserPreferencesAction.
 *      The action revalidates the layout so the sidebar / topbar
 *      pick up the new avatar without a manual refresh.
 *
 * Cache-busting: the file path is stable per user (one avatar per
 * user, replaced on upload). The public URL is therefore also
 * stable — browsers cache it. Append `?v=${Date.now()}` to the URL
 * we save so the next sidebar render fetches the fresh image.
 */
export function AvatarUpload({
  userId,
  initialUrl,
  fallbackInitial,
}: {
  userId: string
  initialUrl: string | null
  /** Single character used in the empty-state fallback (typically email's first char). */
  fallbackInitial: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File): Promise<void> {
    if (!AVATAR_ALLOWED_MIME.includes(file.type as AvatarAllowedMime)) {
      toast.error("Bildformat nicht unterstützt", {
        description: "Bitte ein JPEG, PNG oder WebP wählen.",
      })
      return
    }
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      toast.error("Datei zu groß", {
        description: `Avatar muss kleiner als ${AVATAR_MAX_SIZE_LABEL} sein.`,
      })
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const ext = EXT_BY_MIME[file.type as AvatarAllowedMime]
      const path = `${userId}/avatar.${ext}`

      // upsert: true so the same path replaces the previous avatar.
      // contentType is sent explicitly because some browsers omit it
      // on drag-drop and Supabase falls back to "application/octet-
      // stream" which the bucket's MIME filter would reject.
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path)
      // Cache-bust so the new image shows immediately even though the
      // URL itself didn't change.
      const cacheBusted = `${pub.publicUrl}?v=${Date.now()}`

      const result = await updateUserPreferencesAction({
        avatarUrl: cacheBusted,
      })
      if (!result.ok) throw new Error(result.error)

      setUrl(cacheBusted)
      toast.success("Avatar gespeichert")
      startTransition(() => {
        router.refresh()
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload fehlgeschlagen"
      toast.error("Upload fehlgeschlagen", { description: msg })
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(): Promise<void> {
    setBusy(true)
    try {
      const supabase = createClient()
      // Best-effort delete of all known extensions — we only ever
      // store one, but we don't track which ext is current in the DB,
      // so it's simplest to attempt all three.
      const paths = AVATAR_ALLOWED_MIME.map(
        (m) => `${userId}/avatar.${EXT_BY_MIME[m]}`
      )
      await supabase.storage.from("avatars").remove(paths)

      const result = await updateUserPreferencesAction({ avatarUrl: null })
      if (!result.ok) throw new Error(result.error)

      setUrl(null)
      toast.success("Avatar entfernt")
      startTransition(() => {
        router.refresh()
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Entfernen fehlgeschlagen"
      toast.error("Entfernen fehlgeschlagen", { description: msg })
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    void handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    void handleFile(file)
    // Reset so picking the same file twice still triggers onChange.
    e.target.value = ""
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Avatar className="h-24 w-24 shrink-0">
        {url && <AvatarImage src={url} alt="Avatar" />}
        <AvatarFallback className="bg-secondary text-2xl font-medium">
          {fallbackInitial.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-2">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Avatar hochladen"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card px-4 py-4 text-center text-sm text-muted-foreground transition-colors",
            "hover:border-foreground/30 hover:bg-muted/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dragActive && "border-foreground/40 bg-muted/40",
            busy && "pointer-events-none opacity-50"
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Wird hochgeladen…</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>
                Klicken oder Bild hierher ziehen
              </span>
              <span className="text-xs">
                JPEG, PNG, WebP — max. {AVATAR_MAX_SIZE_LABEL}
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ALLOWED_MIME.join(",")}
            onChange={handleInputChange}
            className="sr-only"
            disabled={busy}
          />
        </div>

        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={busy}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Avatar entfernen
          </Button>
        )}
      </div>
    </div>
  )
}
