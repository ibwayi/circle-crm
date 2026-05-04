"use client"

import { CompanyBulkActions } from "@/components/companies/company-bulk-actions"
import { CompanyTable } from "@/components/companies/company-table"
import { useSelection } from "@/lib/hooks/use-selection"
import type { CompanyWithCounts } from "@/lib/db/companies"

export function CompanyList({
  companies,
}: {
  companies: CompanyWithCounts[]
}) {
  const visibleIds = companies.map((c) => c.id)
  const selection = useSelection(visibleIds)

  return (
    <>
      <CompanyTable
        companies={companies}
        selection={{
          isSelected: selection.isSelected,
          toggle: selection.toggle,
          toggleAll: selection.toggleAll,
          mode: selection.mode,
        }}
      />
      <CompanyBulkActions
        selectedIds={selection.selected}
        visibleCompanies={companies}
        onClear={selection.clear}
      />
    </>
  )
}
