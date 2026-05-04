import { Logo } from "@/components/shared/logo"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="w-full max-w-[400px] rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-3 flex justify-center">
        <Logo size={48} />
      </div>
      <h1 className="mb-6 text-center text-xl font-semibold">
        Welcome to Circle
      </h1>
      <LoginForm />
    </div>
  )
}
