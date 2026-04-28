"use client"

// Placeholder — full topbar (mobile menu, page title, ⌘K, theme toggle)
// lands in T-4.3. The user menu is already in the sidebar from T-4.2;
// we keep a sign-out form here too while mobile UX is unfinished.
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth/actions"

export function Topbar({ email: _email }: { email: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <div className="flex-1" />
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </header>
  )
}
