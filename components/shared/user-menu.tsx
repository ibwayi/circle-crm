"use client"

import { ChevronDown, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth/actions"
import { cn } from "@/lib/utils"

function initialsFromEmail(email: string): string {
  return email[0]?.toUpperCase() ?? "?"
}

export function UserMenu({
  email,
  variant = "default",
}: {
  email: string
  /**
   * `default` — full trigger (avatar + email + chevron), used in the sidebar
   * `compact` — avatar-only trigger, used in the topbar
   */
  variant?: "default" | "compact"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex items-center gap-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          variant === "default"
            ? "w-full px-2 py-2 hover:bg-muted"
            : "p-1 hover:bg-muted"
        )}
        aria-label="Open user menu"
      >
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-secondary text-xs font-medium">
            {initialsFromEmail(email)}
          </AvatarFallback>
        </Avatar>
        {variant === "default" && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm">
              {email}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            void signOut()
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
