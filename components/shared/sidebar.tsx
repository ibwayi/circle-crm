"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, LayoutDashboard, Users, Workflow } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { UserMenu } from "@/components/shared/user-menu"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals", label: "Pipeline", icon: Workflow },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
]

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  return pathname.startsWith(href + "/")
}

export function Sidebar({ email }: { email: string }) {
  return (
    // `fixed` (not `sticky`) takes the aside fully out of document flow
    // so the browser's elastic overscroll can't drag it along with the
    // page. The main content compensates with `pl-60` in the layout.
    // Mobile uses the topbar's <Sheet> pattern instead — that path is
    // unaffected because this aside is `hidden md:flex`.
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-border bg-background md:flex">
      <SidebarContent email={email} />
    </aside>
  )
}

// Extracted so the topbar's mobile <Sheet> can render the same content.
export function SidebarContent({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-6">
        <Link
          href="/dashboard"
          className="text-lg font-medium tracking-tight"
          aria-label="Circle home"
        >
          Circle
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
                active
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu email={email} />
      </div>
    </div>
  )
}
