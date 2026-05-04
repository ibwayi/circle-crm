"use client"

import Link from "next/link"
import { ChevronDown, LogOut, UserRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth/actions"
import { cn } from "@/lib/utils"

function fallbackInitial(displayName: string | null, email: string): string {
  const source = (displayName && displayName.trim()) || email
  return source.charAt(0)?.toUpperCase() ?? "?"
}

export function UserMenu({
  email,
  displayName,
  avatarUrl,
  variant = "default",
}: {
  email: string
  displayName: string | null
  avatarUrl: string | null
  /**
   * `default` — full trigger (avatar + display-name + chevron), used in the sidebar
   * `compact` — avatar-only trigger, used in the topbar
   */
  variant?: "default" | "compact"
}) {
  // Display label: explicit display_name beats the email's local part,
  // which beats the raw email. The full email always shows in the
  // dropdown header so users still know which account they're in.
  const label =
    (displayName && displayName.trim()) || (email.split("@")[0] ?? email)
  const initial = fallbackInitial(displayName, email)

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
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-secondary text-xs font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
        {variant === "default" && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm">
              {label}
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
        <DropdownMenuItem className="cursor-pointer" render={<Link href="/profile" />}>
          <UserRound className="mr-2 h-4 w-4" />
          Profil
        </DropdownMenuItem>
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
