"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"

import {
  createCustomerAction,
  updateCustomerAction,
} from "@/app/(app)/customers/actions"
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
import {
  customerSchema,
  type CustomerFormValues,
} from "@/lib/validations/customer"
import type { Customer } from "@/lib/db/customers"

type Mode =
  | { mode: "create" }
  | { mode: "edit"; customer: Customer }

type Props = Mode & {
  onSuccess: (customerId: string) => void
  onCancel?: () => void
}

const EMPTY_VALUES: CustomerFormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "lead",
  value_eur: "",
}

function customerToValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    company: customer.company ?? "",
    status: customer.status as CustomerFormValues["status"],
    value_eur: customer.value_eur === null ? "" : String(customer.value_eur),
  }
}

// Convert string-only form values back to the DB shape. Empty strings become
// null so we don't write meaningless empty strings to text columns.
function valuesToInput(values: CustomerFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    company: values.company.trim() || null,
    status: values.status,
    value_eur: values.value_eur === "" ? null : Number(values.value_eur),
  }
}

export function CustomerForm(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Track submission with a separate flag — startTransition's `pending` flips
  // off only after the React tree finishes the update, but we want the button
  // disabled the moment the action starts.
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CustomerFormValues>({
    resolver: standardSchemaResolver(customerSchema),
    defaultValues:
      props.mode === "edit" ? customerToValues(props.customer) : EMPTY_VALUES,
  })

  async function onSubmit(values: CustomerFormValues) {
    setSubmitting(true)
    const input = valuesToInput(values)

    const result =
      props.mode === "create"
        ? await createCustomerAction(input)
        : await updateCustomerAction(props.customer.id, input)

    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    if (props.mode === "create") {
      toast.success("Customer added", {
        action: {
          label: "View",
          onClick: () =>
            router.push(`/customers/${result.customerId}`),
        },
      })
    } else {
      toast.success("Changes saved")
    }

    // Refresh the route so server-fetched data (the table, the detail page)
    // reflects the mutation. revalidatePath in the action invalidates the
    // cache; refresh forces the client to re-read it.
    startTransition(() => {
      router.refresh()
    })

    props.onSuccess(result.customerId)
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
                  placeholder="Anna Müller"
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

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value_eur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
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
                ? "Add customer"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
