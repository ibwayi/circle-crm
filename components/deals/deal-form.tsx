"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"

import {
  createDealAction,
  updateDealAction,
} from "@/app/(app)/deals/actions"
import { CompanyCombobox } from "@/components/shared/company-combobox"
import {
  ContactCombobox,
  type ContactOption,
} from "@/components/shared/contact-combobox"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import type { Deal, DealStage } from "@/lib/db/deals"
import {
  DEAL_PRIORITIES,
  DEAL_STAGES,
  dealSchema,
  type DealFormValues,
  type DealPriority,
} from "@/lib/validations/deal"

type Mode =
  | { mode: "create" }
  | { mode: "edit"; deal: Deal }

type Props = Mode & {
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
  onSuccess: (dealId: string) => void
  onCancel?: () => void
}

const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}

const PRIORITY_LABELS: Record<DealPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

const EMPTY_VALUES: DealFormValues = {
  title: "",
  value_eur: "",
  stage: "lead",
  priority: "medium",
  source: "",
  expected_close_date: "",
  probability: "",
  company_id: null,
  primary_contact_id: null,
}

function dealToValues(deal: Deal): DealFormValues {
  // Coerce DB nulls / numbers to the form's string representation. The
  // primary_contact_id is unused in edit mode but the field still exists
  // in the schema; we leave it null.
  return {
    title: deal.title,
    value_eur: deal.value_eur === null ? "" : String(deal.value_eur),
    stage: (deal.stage as DealStage) ?? "lead",
    priority: (deal.priority as DealPriority) ?? "medium",
    source: deal.source ?? "",
    expected_close_date: deal.expected_close_date ?? "",
    probability:
      deal.probability === null ? "" : String(deal.probability),
    company_id: deal.company_id,
    primary_contact_id: null,
  }
}

function valuesToInput(values: DealFormValues) {
  // String → number | null. The schema's refine already guards against
  // junk; here we just drop empties and coerce.
  const value_eur =
    values.value_eur.trim() === "" ? null : Number(values.value_eur)
  const probability =
    values.probability.trim() === "" ? null : Number(values.probability)

  return {
    title: values.title.trim(),
    value_eur,
    stage: values.stage,
    priority: values.priority,
    source: values.source.trim() || null,
    expected_close_date: values.expected_close_date.trim() || null,
    probability,
    company_id: values.company_id,
  }
}

export function DealForm(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const initialValues =
    props.mode === "edit" ? dealToValues(props.deal) : EMPTY_VALUES

  const form = useForm<DealFormValues>({
    resolver: standardSchemaResolver(dealSchema),
    defaultValues: initialValues,
  })

  // Track company_id locally instead of via form.watch() — the watcher trips
  // react-hooks/incompatible-library because the returned function can't be
  // memoised. Same pattern as note-form.tsx's contentLength state.
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    initialValues.company_id
  )

  async function onSubmit(values: DealFormValues) {
    setSubmitting(true)
    const input = valuesToInput(values)
    const result =
      props.mode === "create"
        ? await createDealAction(input, values.primary_contact_id)
        : await updateDealAction(props.deal.id, input)
    setSubmitting(false)

    if (!result.ok) {
      toast.error("Something went wrong", { description: result.error })
      return
    }

    if (props.mode === "create") {
      // Land directly on the new deal so the user can manage contacts /
      // notes — same UX as Phase 17's company create.
      toast.success("Deal added")
      props.onSuccess(result.dealId)
      router.push(`/deals/${result.dealId}`)
      return
    }

    toast.success("Changes saved")
    startTransition(() => {
      router.refresh()
    })
    props.onSuccess(result.dealId)
  }

  const busy = submitting || pending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder="Q4 Website Redesign"
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
            name="stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEAL_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
                    step="0.01"
                    min="0"
                    autoComplete="off"
                    placeholder="12500"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probability (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    max="100"
                    autoComplete="off"
                    placeholder="60"
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
            name="expected_close_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected close</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    placeholder="Referral, LinkedIn, Inbound…"
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
                  onChange={(v) => {
                    field.onChange(v)
                    setSelectedCompanyId(v)
                  }}
                  companies={props.companies}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {props.mode === "create" && (
          <FormField
            control={form.control}
            name="primary_contact_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary contact</FormLabel>
                <FormControl>
                  <ContactCombobox
                    value={field.value}
                    onChange={field.onChange}
                    contacts={props.contacts}
                    scopeCompanyId={selectedCompanyId}
                    placeholder="Select primary contact…"
                    noneLabel="(No primary contact)"
                  />
                </FormControl>
                <FormDescription>
                  Optional. You can add more contacts after creating the deal.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                ? "Add deal"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
