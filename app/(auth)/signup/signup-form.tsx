"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"

import { createClient } from "@/lib/supabase/client"
import { signupSchema, type SignupInput } from "@/lib/validations/auth"
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

type AuthErrorState =
  | { kind: "generic"; message: string }
  | { kind: "already-registered" }
  | null

export function SignupForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState<AuthErrorState>(null)

  const form = useForm<SignupInput>({
    resolver: standardSchemaResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(values: SignupInput) {
    setAuthError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })
    setSubmitting(false)

    if (error) {
      setAuthError({ kind: "generic", message: error.message })
      return
    }

    // Supabase's privacy feature: signing up an existing email returns
    // success with an empty `identities` array (no email is sent and no
    // session is created). Surface this as an "already registered" error.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setAuthError({ kind: "already-registered" })
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {authError?.kind === "generic" && (
            <p
              role="alert"
              className="text-sm text-destructive"
              aria-live="polite"
            >
              {authError.message}
            </p>
          )}
          {authError?.kind === "already-registered" && (
            <p
              role="alert"
              className="text-sm text-destructive"
              aria-live="polite"
            >
              This email is already registered.{" "}
              <Link
                href="/login"
                className="font-medium underline underline-offset-4"
              >
                Sign in instead
              </Link>
              .
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
