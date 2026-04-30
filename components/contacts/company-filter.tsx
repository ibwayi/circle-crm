"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL_VALUE = "__all__"
const NONE_VALUE = "__none__"

export function CompanyFilter({
  initialValue,
  companies,
}: {
  // 'all' (or undefined → 'all'), 'none', or a company UUID
  initialValue: string | null | undefined
  companies: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const value =
    initialValue === null
      ? NONE_VALUE
      : initialValue === undefined
        ? ALL_VALUE
        : initialValue

  // Base UI's Select can emit `null` if the value is cleared programmatically.
  // We treat null the same as ALL_VALUE — drop the filter.
  function handleChange(next: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === null || next === ALL_VALUE) {
      params.delete("company")
    } else if (next === NONE_VALUE) {
      // The literal string "null" in the URL signals "contacts without a
      // company" — page.tsx's parser turns this into companyId: null.
      params.set("company", "null")
    } else {
      params.set("company", next)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All companies" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All companies</SelectItem>
        <SelectItem value={NONE_VALUE}>(No company)</SelectItem>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
