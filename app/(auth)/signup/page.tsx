import Link from "next/link"
import { SignupForm } from "./signup-form"

export default function SignupPage() {
  return (
    <div className="w-full max-w-[400px] rounded-lg border bg-card p-8 shadow-sm">
      <p className="mb-4 text-center text-xs text-muted-foreground">
        Just want to look around?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Try the demo
        </Link>{" "}
        first.
      </p>
      <div className="mb-1 text-center text-sm font-semibold tracking-tight text-muted-foreground">
        Circle
      </div>
      <h1 className="text-center text-xl font-semibold">
        Create your Circle account
      </h1>
      <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">
        Get started in seconds
      </p>
      <SignupForm />
    </div>
  )
}
