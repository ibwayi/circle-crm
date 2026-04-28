"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/shared/sidebar"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { UserMenu } from "@/components/shared/user-menu"

// Hardcoded titles for now — once the customer detail page exists we'll
// match `/customers/[id]` and resolve the customer name dynamically.
function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard"
  if (pathname === "/customers") return "Customers"
  if (pathname.startsWith("/customers/")) return "Customer Details"
  return ""
}

export function Topbar({ email }: { email: string }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)

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

      <kbd
        className="hidden h-7 items-center gap-1 rounded-md border border-border bg-muted px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-flex"
        aria-label="Search shortcut: command K"
        title="Search (coming soon)"
      >
        <span className="text-xs">⌘</span>K
      </kbd>

      <ThemeToggle />

      {/* Compact user menu lives next to the theme toggle on desktop too —
          mirrors the sidebar's bottom UserMenu so users have a familiar
          sign-out target regardless of where they look. */}
      <UserMenu email={email} variant="compact" />
    </header>
  )
}
