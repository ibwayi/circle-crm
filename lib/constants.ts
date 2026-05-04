/**
 * Project-wide UI constants. Keep this file dependency-free so it can
 * be imported from both client and server components without dragging
 * extra modules into either bundle.
 */

// Avatar upload limits — must match the Supabase Storage bucket
// settings (public bucket "avatars" was raised from 2 MB to 5 MB
// during Phase 28 smoke testing). Client validation is a fail-fast
// for UX; the bucket policy is the security boundary.
export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const AVATAR_MAX_SIZE_LABEL = "5 MB"
export const AVATAR_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export type AvatarAllowedMime = (typeof AVATAR_ALLOWED_MIME)[number]

/**
 * Window event dispatched by the profile form after a preferences
 * save succeeds. Carries no payload — listeners use it as a
 * "re-read your snapshot" signal. The form clears the relevant
 * localStorage keys synchronously BEFORE dispatching, so any
 * useSyncExternalStore listening for this event will read fresh
 * (empty) localStorage and fall back to the server-rendered
 * preference prop.
 *
 * Phase 29 fix: previously the layered hooks read localStorage
 * unconditionally, so a stale "circle:deals-view" entry from an
 * earlier session would override a freshly-saved preference. Now
 * "save in /profile" wins over "previous device choice".
 */
export const PREFERENCES_CHANGED_EVENT = "circle:preferences-changed"

/**
 * localStorage keys that mirror user_preferences columns. Listed
 * here so the profile form can clear them all in a single sweep
 * without each hook needing to expose its key.
 */
export const PREFERENCE_STORAGE_KEYS = [
  "circle:deals-view",
  "circle:stale-threshold",
] as const
