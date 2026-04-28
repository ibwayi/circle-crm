import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CustomersPage() {
  return (
    <div className="space-y-6 p-6 md:p-8">
      <header>
        <h2 className="text-2xl font-medium tracking-tight">Customers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every lead from first contact to closed deal.
        </p>
      </header>

      <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium">No customers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer management ships in Phase 5.
            </p>
          </div>
          <Button type="button" disabled>
            Add Customer
          </Button>
        </div>
      </div>
    </div>
  )
}
