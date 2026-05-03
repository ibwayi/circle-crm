"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu, Search } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/shared/sidebar"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { UserMenu } from "@/components/shared/user-menu"
import { useCommandPalette } from "@/lib/hooks/use-command-palette"

// Hardcoded titles. Detail pages render their own h2 inside the page body,
// so the topbar just shows the section name — no per-record fetch needed.
function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard"
  if (pathname === "/deals" || pathname.startsWith("/deals/")) return "Pipeline"
  if (pathname === "/tasks") return "Tasks"
  if (pathname === "/companies") return "Companies"
  if (pathname.startsWith("/companies/")) return "Company"
  if (pathname === "/contacts") return "Contacts"
  if (pathname.startsWith("/contacts/")) return "Contact"
  return ""
}

export function Topbar({ email }: { email: string }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { setOpen: setPaletteOpen } = useCommandPalette()

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:gap-4 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent email={email} />
        </SheetContent>
      </Sheet>

      {title && (
        <h1 className="text-base font-medium tracking-tight">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Search affordance — clickable on every viewport (the kbd hint
          is desktop-only). Opens the global Cmd+K palette via the
          shared useCommandPalette() store. The keyboard shortcut
          itself is registered inside CommandPalette. */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Suchen oder Aktion ausführen (⌘K)"
        title="Suchen oder Aktion ausführen"
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Suchen</span>
        <kbd
          aria-hidden="true"
          className="hidden h-5 items-center gap-0.5 rounded border border-border bg-background px-1 font-mono text-[10px] uppercase tracking-wider sm:inline-flex"
        >
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <ThemeToggle />

      {/* Compact user menu lives next to the theme toggle on desktop too —
          mirrors the sidebar's bottom UserMenu so users have a familiar
          sign-out target regardless of where they look. */}
      <UserMenu email={email} variant="compact" />
    </header>
  )
}
