"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG === "true") {
      console.error("Auth error:", error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-medium">Couldn&apos;t load this page</h2>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh.</p>
        <div className="mt-6 flex justify-center">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
