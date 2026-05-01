import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

import { DealContactsSection } from "@/components/deals/deal-contacts-section"
import { DealDetailActions } from "@/components/deals/deal-detail-actions"
import {
  STAGE_CONFIG,
  StageBadge,
  type DealStage,
} from "@/components/deals/stage-badge"
import { NotesSection } from "@/components/shared/notes-section"
import { TasksSection } from "@/components/shared/tasks-section"
import type { ContactOption } from "@/components/shared/contact-combobox"
import { Card, CardContent } from "@/components/ui/card"
import { listCompanies } from "@/lib/db/companies"
import { listContacts } from "@/lib/db/contacts"
import { getDeal } from "@/lib/db/deals"
import { listNotesForDeal } from "@/lib/db/notes"
import { listTasksForDeal } from "@/lib/db/tasks"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
}

function formatAbsolute(iso: string): string {
  return format(new Date(iso), "d. MMMM yyyy 'um' HH:mm", { locale: de })
}

function formatDateOnly(iso: string): string {
  return format(new Date(iso), "d. MMMM yyyy", { locale: de })
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const result = await getDeal(supabase, id)
  if (!result) {
    notFound()
  }

  const { deal, company, contacts } = result

  // Edit dialog needs the company list for the combobox; the contact picker
  // (in both the create-style edit form and the link dialog) needs every
  // contact the user has. Run both lookups in parallel with the notes fetch.
  const [companiesFull, contactsFull, notes, tasks] = await Promise.all([
    listCompanies(supabase),
    listContacts(supabase),
    listNotesForDeal(supabase, deal.id),
    listTasksForDeal(supabase, deal.id),
  ])

  const companies = companiesFull.map((c) => ({ id: c.id, name: c.name }))
  const candidates: ContactOption[] = contactsFull.map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    position: c.position,
    company_id: c.company_id,
    company_name: c.company?.name ?? null,
  }))

  const stage = deal.stage as DealStage
  const stageConfig = STAGE_CONFIG[stage]
  const isClosed = stage === "won" || stage === "lost"

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Link
        href="/deals"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to deals
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-medium tracking-tight">{deal.title}</h2>
          {company && (
            <p className="text-sm text-muted-foreground">
              <Link
                href={`/companies/${company.id}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {company.name}
              </Link>
              {company.industry && (
                <>
                  {" "}
                  <span aria-hidden="true">·</span> {company.industry}
                </>
              )}
            </p>
          )}
        </div>
        <DealDetailActions
          deal={deal}
          companies={companies}
          contacts={candidates}
        />
      </header>

      {/* Hero card — stage, value, priority, expected close, closed-at if
          applicable. Larger typography than the standard info card so it
          reads as the primary status line of the deal. */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <StageBadge
                stage={stage}
                className="px-3 py-1 text-sm"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Value
                </p>
                <p
                  className={cn(
                    "text-3xl font-medium tabular-nums",
                    deal.value_eur === null && "text-muted-foreground"
                  )}
                >
                  {deal.value_eur === null
                    ? "—"
                    : eurFormatter.format(deal.value_eur)}
                </p>
              </div>
            </div>

            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field
                label="Priority"
                value={
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      color:
                        deal.priority === "high"
                          ? `var(${stageConfig.cssVar})`
                          : undefined,
                    }}
                  >
                    {PRIORITY_LABELS[deal.priority] ?? deal.priority}
                  </span>
                }
              />
              {deal.expected_close_date && (
                <Field
                  label="Expected close"
                  value={formatDateOnly(deal.expected_close_date)}
                />
              )}
              {isClosed && deal.closed_at && (
                <Field
                  label={stage === "won" ? "Won on" : "Lost on"}
                  value={formatDateOnly(deal.closed_at)}
                />
              )}
              {deal.probability !== null && (
                <Field label="Probability" value={`${deal.probability}%`} />
              )}
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Sparse info card — only renders rows for fields with values. */}
      {(deal.source ||
        deal.created_at ||
        deal.updated_at) && (
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {deal.source && <Field label="Source" value={deal.source} />}
              <Field
                label="Created"
                value={
                  <span className="text-xs text-muted-foreground">
                    {formatAbsolute(deal.created_at)}
                  </span>
                }
              />
              <Field
                label="Last updated"
                value={
                  <span className="text-xs text-muted-foreground">
                    {formatAbsolute(deal.updated_at)}
                  </span>
                }
              />
            </dl>
          </CardContent>
        </Card>
      )}

      <CompanySection company={company} />

      <DealContactsSection
        dealId={deal.id}
        dealCompanyId={deal.company_id}
        contacts={contacts}
        candidates={candidates}
      />

      <TasksSection
        target={{ type: "deal", dealId: deal.id }}
        initialTasks={tasks}
      />

      <NotesSection
        target={{ type: "deal", dealId: deal.id }}
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
      <dd className="mt-1">{value}</dd>
    </div>
  )
}

function CompanySection({
  company,
}: {
  company: { id: string; name: string; industry: string | null; website: string | null } | null
}) {
  return (
    <section aria-labelledby="deal-company-heading" className="space-y-3">
      <h3 id="deal-company-heading" className="text-base font-medium">
        Company
      </h3>
      {company ? (
        <Link
          href={`/companies/${company.id}`}
          className="flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Building2
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{company.name}</p>
            {company.industry && (
              <p className="truncate text-xs text-muted-foreground">
                {company.industry}
              </p>
            )}
          </div>
          {company.website && (
            <span className="shrink-0 text-muted-foreground">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </Link>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No company assigned. Use Edit to link one.
        </p>
      )}
    </section>
  )
}

