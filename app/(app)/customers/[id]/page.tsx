import { redirect } from "next/navigation"

// /customers/[id] retired in Phase 16. There's no cheap customer→deal id
// mapping (the 0008 migration moved the data; the new ids live on `deals`
// and `contacts`). Land on the pipeline list; the user can find the deal
// from there.
export default function CustomerDetailRedirect() {
  redirect("/deals")
}
