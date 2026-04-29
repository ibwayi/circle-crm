"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // Render Moon by default. The server has no theme, and `resolvedTheme` is
  // also undefined on the client's first paint before next-themes hydrates.
  // After hydration the value resolves and the icon flips to Sun in dark
  // mode. The brief flip-on-mount is acceptable; the previous mounted-flag
  // guard is forbidden by `react-hooks/set-state-in-effect`.
  const isDark = resolvedTheme === "dark"
  const Icon = isDark ? Sun : Moon

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}
