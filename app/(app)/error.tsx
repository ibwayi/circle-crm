"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface errors locally without leaking them to the user. In production
    // the error.digest is sent to Vercel/Sentry-style logs by Next.
    if (process.env.NEXT_PUBLIC_DEBUG === "true") {
      console.error("App error:", error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-medium">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve logged the error. Please try again or refresh the page.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "ghost" })}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
