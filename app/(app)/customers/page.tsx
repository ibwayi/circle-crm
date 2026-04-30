import { redirect } from "next/navigation"

// /customers retired in Phase 16 — the 1.0 single-table model has been
// replaced by Companies / Contacts / Deals (Phase 14-21). Old bookmarks
// land on the pipeline view; the customers table itself is dropped in
// Phase 16.5.
export default function CustomersRedirect() {
  redirect("/deals")
}
