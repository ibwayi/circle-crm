"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"

import {
  createContactAction,
  updateContactAction,
} from "@/app/(app)/contacts/actions"
import { CompanyCombobox } from "@/components/shared/company-combobox"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { Contact } from "@/lib/db/contacts"
import {
  contactSchema,
  type ContactFormValues,
} from "@/lib/validations/contact"

type Mode =
  | { mode: "create" }
  | { mode: "edit"; contact: Contact }

type Props = Mode & {
  companies: { id: string; name: string }[]
  onSuccess: (contactId: string) => void
  onCancel?: () => void
}

const EMPTY_VALUES: ContactFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  birthday: "",
  company_id: null,
}

function contactToValues(contact: Contact): ContactFormValues {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    position: contact.position ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    birthday: contact.birthday ?? "",
    company_id: contact.company_id,
  }
}

function valuesToInput(values: ContactFormValues) {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    position: values.position.trim() || null,
    linkedin_url: values.linkedin_url.trim() || null,
    birthday: values.birthday.trim() || null,
    company_id: values.company_id,
  }
}

export function ContactForm(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ContactFormValues>({
    resolver: standardSchemaResolver(contactSchema),
    defaultValues:
      props.mode === "edit" ? contactToValues(props.contact) : EMPTY_VALUES,
  })

  async function onSubmit(values: ContactFormValues) {
    setSubmitting(true)
    const input = valuesToInput(values)
    const result =
      props.mode === "create"
        ? await createContactAction(input)
        : await updateContactAction(props.contact.id, input)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    if (props.mode === "create") {
      toast.success("Contact added", {
        action: {
          label: "View",
          onClick: () => router.push(`/contacts/${result.contactId}`),
        },
      })
    } else {
      toast.success("Changes saved")
    }

    startTransition(() => {
      router.refresh()
    })

    props.onSuccess(result.contactId)
  }

  const busy = submitting || pending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    placeholder="Anna"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    placeholder="Schäfer"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <CompanyCombobox
                  value={field.value}
                  onChange={field.onChange}
                  companies={props.companies}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder="Head of Sales"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="off"
                    placeholder="anna@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="off"
                    placeholder="+49 30 1234567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="linkedin_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    autoComplete="off"
                    placeholder="https://linkedin.com/in/…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="birthday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birthday</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {props.onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={props.onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? props.mode === "create"
                ? "Adding…"
                : "Saving…"
              : props.mode === "create"
                ? "Add contact"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
