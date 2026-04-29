import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </section>

      <Skeleton className="h-32 rounded-xl" />

      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  )
}
