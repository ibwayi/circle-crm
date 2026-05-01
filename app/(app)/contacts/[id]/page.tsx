import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ExternalLink,
  Gift,
  Mail,
  Phone,
  Plus,
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

import { ContactDetailActions } from "@/components/contacts/contact-detail-actions"
import { StageBadge, type DealStage } from "@/components/deals/stage-badge"
import { NotesSection } from "@/components/shared/notes-section"
import { TasksSection } from "@/components/shared/tasks-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { listCompanies } from "@/lib/db/companies"
import { getContact } from "@/lib/db/contacts"
import { listNotesForContact } from "@/lib/db/notes"
import { listTasksForContact } from "@/lib/db/tasks"
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

function formatBirthday(iso: string): string {
  // birthday is stored as YYYY-MM-DD (no timezone). new Date() interprets
  // it as UTC midnight, which can shift in some locales — but for a
  // German user formatting in `de` locale the shift is invisible.
  return format(new Date(iso), "d. MMMM yyyy", { locale: de })
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const result = await getContact(supabase, id)

  if (!result) {
    notFound()
  }

  // Companies list (for the Edit dialog's combobox). Fetched in parallel
  // with the contact lookup elsewhere; here we sequence after the
  // notFound check so we don't waste a query on a 404.
  const companiesFull = await listCompanies(supabase)
  const companies = companiesFull.map((c) => ({ id: c.id, name: c.name }))

  const { contact, company, deals } = result
  const [notes, tasks] = await Promise.all([
    listNotesForContact(supabase, contact.id),
    listTasksForContact(supabase, contact.id),
  ])
  const fullName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to contacts
      </Link>

      <header className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">{fullName}</h2>
        {(contact.position || company) && (
          <p className="text-sm text-muted-foreground">
            {contact.position}
            {contact.position && company && " @ "}
            {company && (
              <Link
                href={`/companies/${company.id}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {company.name}
              </Link>
            )}
          </p>
        )}
      </header>

      <ContactDetailActions
        contact={contact}
        companies={companies}
        dealCount={deals.length}
      />

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {contact.email && (
              <Field
                label="Email"
                value={
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    <Mail
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {contact.email}
                  </a>
                }
              />
            )}
            {contact.phone && (
              <Field
                label="Phone"
                value={
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    <Phone
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {contact.phone}
                  </a>
                }
              />
            )}
            {contact.linkedin_url && (
              <Field
                label="LinkedIn"
                value={
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {contact.linkedin_url}
                    <ExternalLink
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </a>
                }
              />
            )}
            {contact.birthday && (
              <Field
                label="Birthday"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Gift
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {formatBirthday(contact.birthday)}
                  </span>
                }
              />
            )}
            <Field
              label="Last updated"
              value={
                <span className="text-xs text-muted-foreground">
                  {formatAbsolute(contact.updated_at)}
                </span>
              }
            />
          </dl>
        </CardContent>
      </Card>

      <DealsSection deals={deals} />

      <TasksSection
        target={{ type: "contact", contactId: contact.id }}
        initialTasks={tasks}
        context={{
          companyName: company?.name ?? undefined,
          // No "primary contact" hint on a contact page — we ARE the
          // contact. Skipped intentionally.
        }}
      />

      <NotesSection
        target={{ type: "contact", contactId: contact.id }}
        initialNotes={notes}
      />
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

function DealsSection({
  deals,
}: {
  deals: {
    id: string
    title: string
    stage: string
    value_eur: number | null
    is_primary: boolean
  }[]
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
          Add deal for this contact
        </Button>
      </header>

      {deals.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No deals linked to this contact yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {deals.map((deal) => (
            <li key={deal.id}>
              <Link
                href={`/deals/${deal.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium">{deal.title}</p>
                  {deal.is_primary && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Primary
                    </span>
                  )}
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

