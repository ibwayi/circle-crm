"use client"

// Placeholder — full sidebar (brand, nav, user menu) lands in T-4.2.
// Renders only on md+ screens; mobile drawer trigger ships with topbar.
export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:block">
      <div className="px-6 py-6 text-lg font-medium">Circle</div>
    </aside>
  )
}
