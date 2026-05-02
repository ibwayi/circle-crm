"use client"

import { useEffect } from "react"
import "./globals.css"

// global-error replaces the root layout when a render fails above the per-
// route error boundaries. It must include <html> and <body> tags. We render
// plain HTML controls here — if the root layout failed we can't safely rely
// on font loading or theme provider context, only on globals.css.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG === "true") {
      console.error("Global error:", error)
    }
  }, [error])

  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-medium">Something broke</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The page couldn&apos;t load. Please refresh.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
