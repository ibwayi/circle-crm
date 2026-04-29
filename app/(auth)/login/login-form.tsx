"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { signInAsDemoAction } from "@/app/(auth)/actions"
import { createClient } from "@/lib/supabase/client"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function LoginForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [demoPending, startDemoTransition] = useTransition()
  const [authError, setAuthError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginInput) {
    setAuthError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(values)
    setSubmitting(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  function handleDemoClick() {
    startDemoTransition(async () => {
      const result = await signInAsDemoAction()
      // On success the action redirects server-side — we only reach here on
      // error. result is always a { error } object when this resolves.
      if (result?.error) {
        toast.error("Couldn't sign in", { description: result.error })
      }
    })
  }

  return (
    <div>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={handleDemoClick}
        disabled={demoPending}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {demoPending ? "Loading demo…" : "Try as Demo User"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Explore the CRM with sample data — no signup needed.
      </p>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          or sign in with your account
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {authError && (
            <p
              role="alert"
              className="text-sm text-destructive"
              aria-live="polite"
            >
              {authError}
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Circle?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
