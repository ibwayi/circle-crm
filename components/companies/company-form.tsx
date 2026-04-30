"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"

import {
  createCompanyAction,
  updateCompanyAction,
} from "@/app/(app)/companies/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Company } from "@/lib/db/companies"
import {
  COMPANY_SIZE_RANGES,
  companySchema,
  type CompanyFormValues,
} from "@/lib/validations/company"

type Mode =
  | { mode: "create" }
  | { mode: "edit"; company: Company }

type Props = Mode & {
  onSuccess: (companyId: string) => void
  onCancel?: () => void
}

const EMPTY_VALUES: CompanyFormValues = {
  name: "",
  website: "",
  industry: "",
  phone: "",
  email: "",
  address: "",
  size_range: "",
}

function companyToValues(company: Company): CompanyFormValues {
  // Coerce DB nulls to empty strings for the form — controlled inputs
  // can't hold null and Zod's union(literal(''), …) accepts the empty.
  return {
    name: company.name,
    website: company.website ?? "",
    industry: company.industry ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    address: company.address ?? "",
    size_range:
      company.size_range &&
      (COMPANY_SIZE_RANGES as readonly string[]).includes(company.size_range)
        ? (company.size_range as CompanyFormValues["size_range"])
        : "",
  }
}

// Convert string-only form values back to the DB shape. Empty strings →
// null so we don't write meaningless empties to nullable columns.
function valuesToInput(values: CompanyFormValues) {
  return {
    name: values.name.trim(),
    website: values.website.trim() || null,
    industry: values.industry.trim() || null,
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    address: values.address.trim() || null,
    size_range: values.size_range === "" ? null : values.size_range,
  }
}

export function CompanyForm(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Independent flag from the transition pending — we want the button
  // disabled the moment the action starts, not after the React tree
  // finishes the update.
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CompanyFormValues>({
    resolver: standardSchemaResolver(companySchema),
    defaultValues:
      props.mode === "edit" ? companyToValues(props.company) : EMPTY_VALUES,
  })

  async function onSubmit(values: CompanyFormValues) {
    setSubmitting(true)
    const input = valuesToInput(values)
    const result =
      props.mode === "create"
        ? await createCompanyAction(input)
        : await updateCompanyAction(props.company.id, input)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    if (props.mode === "create") {
      toast.success("Company added", {
        action: {
          label: "View",
          onClick: () => router.push(`/companies/${result.companyId}`),
        },
      })
    } else {
      toast.success("Changes saved")
    }

    startTransition(() => {
      router.refresh()
    })

    props.onSuccess(result.companyId)
  }

  const busy = submitting || pending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder="Acme GmbH"
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
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    placeholder="SaaS"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="size_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COMPANY_SIZE_RANGES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  autoComplete="off"
                  placeholder="https://acme.de"
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
                    placeholder="hello@acme.de"
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

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  autoComplete="off"
                  rows={2}
                  className="min-h-16 resize-none"
                  placeholder="Bahnhofstr. 1, 10115 Berlin"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                ? "Add company"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
