import { redirect } from "next/navigation"

// The proxy already redirects authenticated/unauthenticated users from `/`,
// but a real route handler keeps the home path well-defined and survives
// the matcher being widened later.
export default function Home() {
  redirect("/dashboard")
}
