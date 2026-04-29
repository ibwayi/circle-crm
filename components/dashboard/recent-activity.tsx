import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import {
  StatusBadge,
  type CustomerStatus,
} from "@/components/customers/status-badge"
import type { Customer } from "@/lib/db/customers"

export function RecentActivity({ customers }: { customers: Customer[] }) {
  return (
    <section aria-labelledby="recent-heading" className="space-y-4">
      <h3 id="recent-heading" className="text-base font-medium">
        Recent activity
      </h3>

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No activity yet. Add your first customer.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {customer.name}
                </span>
                <StatusBadge status={customer.status as CustomerStatus} />
                <time
                  dateTime={customer.updated_at}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {formatDistanceToNow(new Date(customer.updated_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
