import { SignupForm } from "./signup-form"

export default function SignupPage() {
  return (
    <div className="w-full max-w-[400px] rounded-lg border bg-card p-8 shadow-sm">
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
