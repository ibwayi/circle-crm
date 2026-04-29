import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="w-full max-w-[400px] rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-1 text-center text-sm font-semibold tracking-tight text-muted-foreground">
        Circle
      </div>
      <h1 className="mb-6 text-center text-xl font-semibold">
        Welcome to Circle
      </h1>
      <LoginForm />
    </div>
  )
}
