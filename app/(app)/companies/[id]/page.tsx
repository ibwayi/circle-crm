import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Plus,
  Users,
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

import { CompanyDetailActions } from "@/components/companies/company-detail-actions"
import { StageBadge, type DealStage } from "@/components/deals/stage-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCompany } from "@/lib/db/companies"
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

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const result = await getCompany(supabase, id)

  if (!result) {
    notFound()
  }

  const { company, contacts, deals } = result

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Link
        href="/companies"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to companies
      </Link>

      <header className="space-y-2">
        <h2 className="text-2xl font-medium tracking-tight">{company.name}</h2>
        {company.industry && (
          <p className="text-sm text-muted-foreground">{company.industry}</p>
        )}
      </header>

      <CompanyDetailActions
        company={company}
        contactCount={contacts.length}
        dealCount={deals.length}
      />

      {/* Info card — only renders rows for non-null fields, so a sparse
          company doesn't carry a wall of "—" placeholders. */}
      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {company.website && (
              <Field
                label="Website"
                value={
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {company.website}
                    <ExternalLink
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </a>
                }
              />
            )}
            {company.email && (
              <Field
                label="Email"
                value={
                  <a
                    href={`mailto:${company.email}`}
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    <Mail
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {company.email}
                  </a>
                }
              />
            )}
            {company.phone && (
              <Field
                label="Phone"
                value={
                  <a
                    href={`tel:${company.phone}`}
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    <Phone
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {company.phone}
                  </a>
                }
              />
            )}
            {company.size_range && (
              <Field label="Size" value={company.size_range} />
            )}
            {company.address && (
              <Field
                label="Address"
                value={
                  <span className="inline-flex items-start gap-1">
                    <MapPin
                      className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="whitespace-pre-wrap">
                      {company.address}
                    </span>
                  </span>
                }
              />
            )}
            <Field
              label="Last updated"
              value={formatAbsolute(company.updated_at)}
            />
          </dl>
        </CardContent>
      </Card>

      <ContactsSection contacts={contacts} />

      <DealsSection deals={deals} />

      <NotesPlaceholder />
    </div>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  )
}

function ContactsSection({
  contacts,
}: {
  contacts: { id: string; first_name: string; last_name: string | null; position: string | null }[]
}) {
  return (
    <section aria-labelledby="contacts-heading" className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 id="contacts-heading" className="text-base font-medium">
          Contacts{" "}
          <span className="text-xs text-muted-foreground">
            ({contacts.length})
          </span>
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title="Add Contact UI coming in Phase 18"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add contact
        </Button>
      </header>

      {contacts.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No contacts at this company yet.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {contacts.map((contact) => {
            const fullName = [contact.first_name, contact.last_name]
              .filter(Boolean)
              .join(" ")
            return (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Users
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{fullName}</p>
                    {contact.position && (
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.position}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function DealsSection({
  deals,
}: {
  deals: { id: string; title: string; stage: string; value_eur: number | null }[]
}) {
  return (
    <section aria-labelledby="deals-heading" className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 id="deals-heading" className="text-base font-medium">
          Deals{" "}
          <span className="text-xs text-muted-foreground">
            ({deals.length})
          </span>
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title="Add Deal UI coming in Phase 21"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add deal
        </Button>
      </header>

      {deals.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No deals linked to this company yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {deals.map((deal) => (
            <li key={deal.id}>
              <Link
                href={`/deals/${deal.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{deal.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatEur(deal.value_eur)}
                  </span>
                  <StageBadge stage={deal.stage as DealStage} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NotesPlaceholder() {
  return (
    <section aria-labelledby="notes-heading" className="space-y-3">
      <h3 id="notes-heading" className="text-base font-medium">
        Notes
      </h3>
      <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        Notes are coming in Phase 19.
      </p>
    </section>
  )
}
