import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

import {
  StatusBadge,
  type CustomerStatus,
} from "@/components/customers/status-badge"
import { CustomerDetailActions } from "@/components/customers/customer-detail-actions"
import { NotesSection } from "@/components/customers/notes-section"
import { Card, CardContent } from "@/components/ui/card"
import { getCustomer } from "@/lib/db/customers"
import { listNotesForCustomer } from "@/lib/db/notes"
import { createClient } from "@/lib/supabase/server"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

function formatEur(value: number | null): string {
  return value === null ? "—" : eurFormatter.format(value)
}

function formatAbsolute(iso: string): string {
  return format(new Date(iso), "d. MMMM yyyy 'um' HH:mm", { locale: de })
}

export default async function CustomerDetailPage({
  params,
}: {
  // Next 16: params is a Promise. Awaiting it is mandatory; destructuring
  // the prop directly throws a runtime error in App Router.
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const customer = await getCustomer(supabase, id)

  if (!customer) {
    notFound()
  }

  const notes = await listNotesForCustomer(supabase, customer.id)

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to customers
      </Link>

      <header className="space-y-2">
        <h2 className="text-2xl font-medium tracking-tight">{customer.name}</h2>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {customer.company && <span>{customer.company}</span>}
          {customer.company && <span aria-hidden="true">·</span>}
          <StatusBadge status={customer.status as CustomerStatus} />
        </div>
      </header>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Email" value={customer.email} />
            <Field label="Phone" value={customer.phone} />
            <Field label="Value" value={formatEur(customer.value_eur)} />
            <Field label="Created" value={formatAbsolute(customer.created_at)} />
            <Field
              label="Last updated"
              value={formatAbsolute(customer.updated_at)}
            />
          </dl>
        </CardContent>
      </Card>

      <CustomerDetailActions customer={customer} />

      <NotesSection customerId={customer.id} notes={notes} />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value ?? "—"}</dd>
    </div>
  )
}
