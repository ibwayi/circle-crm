# Circle — Ticket Plan

> Living document. Claude Code MUST update this file after every completed ticket.
> Check off `[ ]` → `[x]` and add a brief completion note if implementation deviated from the plan.

**Legend:**
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `🔧` Manual step (user does this, not Claude Code)
- `🤖` Claude Code ticket

---

## Phase 0 — Setup (Manual) 🔧

These happen on your machine before Claude Code does anything. Confirm each before proceeding.

- [x] **T-0.1** Verify local tools installed: `node` (≥20), `pnpm`, `git`, `claude` (Claude Code CLI)
- [x] **T-0.2** Create GitHub repo `circle-crm` (public, MIT license, no README — we'll write our own)
- [x] **T-0.3** Create new Supabase account (second email) → org → project `circle-crm`
- [x] **T-0.4** Create Vercel project, link to GitHub repo (do NOT deploy yet — wait until envs are set)
- [ ] **T-0.5** DNS: add CNAME `crm` → `cname.vercel-dns.com` in your DNS provider for ibwayi.com
- [x] **T-0.6** Place `CLAUDE.md`, `CONCEPT.md`, `TICKETS.md` in the repo root and commit
- [ ] **T-0.7** Run `claude` in the project root and paste the **Initialization Prompt** (provided separately)

---

## Phase 1 — Foundation 🤖

- [x] **T-1.1** Initialize Next.js 16 + TypeScript + Tailwind via `pnpm create next-app`
  - App Router, src dir = no, alias `@/*`
  - Strict TS, no ESLint disabled rules
  - _Installed: Next.js **16.2.4**, Tailwind v4, React 19.2, Turbopack default. See `AGENTS.md` for Next 16 breaking-change notes._
- [x] **T-1.2** shadcn/ui setup — `pnpm dlx shadcn@latest init`
  - Style: New York, base color: Zinc, CSS variables: yes
  - Add core primitives: button, input, dialog, dropdown-menu, avatar, badge, table, tabs, sonner
  - _CLI deviations: 2025 shadcn dropped `--style` and `--base-color` flags (New York is the only style now; color is bundled into themed presets `nova|vega|maia|lyra|mira|luma|sera`). Initialized with `--defaults` → preset `base-nova`, baseColor `neutral`. Palette manually overridden in `app/globals.css` to match CONCEPT.md (Monday-inspired zinc neutral, OKLCH form for Tailwind v4)._
  - _Installed 15/16 primitives: button, input, label, dialog, dropdown-menu, avatar, badge, table, tabs, sonner, alert-dialog, textarea, card, sheet, skeleton. **Skipped: `form`** — registry entry for `base-nova` is empty (only `new-york` style currently ships it). Add later via direct URL or alternative when first form is needed._
- [x] **T-1.3** Supabase client setup (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
  - Browser client (`createBrowserClient`), async server client (`createServerClient` + awaited `cookies()`), and `updateSession` helper for the proxy.
  - _Deviation: root file is **`proxy.ts`** not `middleware.ts` — Next 16 renamed the convention (old name deprecated). Internal helper at `lib/supabase/middleware.ts` keeps the Supabase-canonical name. CLAUDE.md Framework Notes updated._
  - _Created `.env.local` with placeholders — user must fill real Supabase keys before `pnpm dev`._
- [x] **T-1.4** Env files: `.env.example` with placeholders + `.env.local` (gitignored, real values)
  - _Both files were already created in T-1.3. Verified `.env.example` carries the three keys and `.env.local` is matched by the `.env*.local` rule in `.gitignore`. Real values populated locally._
- [x] **T-1.5** Add `DECISIONS.md` and seed it with the first ADR: "Why Supabase + Server Components"
  - _Seeded with two ADRs instead of one: ADR-001 (Supabase + RLS) and ADR-002 (App Router + Server Components). Both decisions inform foundational tickets in Phases 2–4._
- [x] **T-1.6** Verify `pnpm build` passes and commit clean baseline
  - _Build clean (1.4s compile, 1.8s TypeScript). Lockfile up-to-date. File tree audit passed: all living docs, config, code dirs, and `proxy.ts` present at expected locations._

---

## Phase 2 — Database 🤖

- [x] **T-2.1** Create `supabase/migrations/` and write migration `0001_init_schema.sql`
  - Tables: `customers`, `notes` (per CONCEPT.md schema)
  - Indexes on `user_id`, `status`, `customer_id`
  - _Includes a reusable `public.set_updated_at()` trigger function (used on `customers`; future tables can reuse). `notes.user_id` is denormalized from `customer_id` so RLS can gate notes directly without a join._
  - _Adds `notes_check_ownership()` trigger (BEFORE INSERT OR UPDATE) that enforces `notes.user_id = customers.user_id` at the DB layer. SECURITY DEFINER + `IS DISTINCT FROM` so the check holds even for service-role connections that bypass RLS._
- [x] **T-2.2** Migration `0002_rls.sql` — enable RLS, write policies for both tables
  - _Single `FOR ALL` policy per table, gated on `auth.uid() = user_id`, with explicit `WITH CHECK` for clarity (defaults to `USING` if omitted)._
- [ ] **T-2.3** Apply migrations to Supabase project (CLI or dashboard SQL editor)
- [x] **T-2.4** Generate TypeScript types: `pnpm dlx supabase gen types typescript --project-id <id> > types/database.ts`
  - _Generated against project `uwxrjxlaceuoqjrepsav` (PostgrestVersion 14.5). 225 lines, both `customers` and `notes` present with `Row`/`Insert`/`Update` types._
  - _Limitation: Supabase gen-types does **not** reflect CHECK constraints, so `customers.status` is typed as `string` (not `'lead' | 'customer' | 'closed'`). The union is narrowed manually in `lib/db/customers.ts`. To get a real union from gen-types we'd need to convert the CHECK to a Postgres ENUM — deferred._
  - _Auth: requires `SUPABASE_ACCESS_TOKEN` (personal token, not project secret). Documented in `.env.example` as a commented-out optional._
- [x] **T-2.5** Build typed query helpers in `lib/db/customers.ts` and `lib/db/notes.ts` (CRUD functions, all typed)
  - _Each helper takes a `SupabaseClient<Database>` as the first argument so it works with both browser and server clients. All async, all throw on error._
  - _`CustomerStatus = 'lead' | 'customer' | 'closed'` defined manually (CHECK constraint not in generated types). `getCustomerStats` returns counts + sum of `value_eur` across non-closed rows. Search uses `ilike.%term%` OR'd across name/email/company; `escapeIlike` neutralises `%`, `_`, and `\\` in user input._

---

## Phase 3 — Auth 🤖

- [x] **T-3.1** Login page `app/(auth)/login/page.tsx` with email + password form (Zod validated)
  - _Server Component shell + Client form (`login-form.tsx`); `(auth)/layout.tsx` centers content; `lib/validations/auth.ts` holds Zod schemas; `<Toaster />` mounted in root layout for the demo-button toast._
  - _Form primitive added late from `https://ui.shadcn.com/r/styles/new-york/form.json` (missing in base-nova preset)._
  - _Used `standardSchemaResolver` from `@hookform/resolvers/standard-schema` instead of `zodResolver`. Reason: `@hookform/resolvers@5.2.2` ships type defs targeted at zod 4.0 and our installed zod 4.3 fails the `_zod.version.minor` check. Standard Schema is version-agnostic and zod 4 implements it._
- [x] **T-3.2** Signup page `app/(auth)/signup/page.tsx`
  - _Mirrors login: shell + `signup-form.tsx`. Uses `signupSchema` (email + password + confirmPassword with refine). Detects already-registered via `data.user.identities.length === 0` (Supabase privacy default returns success with empty identities for existing emails); error message links to `/login` ("Sign in instead")._
- [x] **T-3.3** Auth callback handler + cookie-based session
  - _`updateSession` now returns `{ response, user }`. `proxy.ts` adds redirect logic — unauthenticated users on non-public paths → `/login`; authenticated users on `/login`, `/signup`, or `/` → `/dashboard`. Set-Cookie headers from session refresh are copied onto redirect responses so the browser doesn't keep stale cookies._
  - _Stub `app/(app)/layout.tsx` (full shell deferred to Phase 4). `app/(app)/dashboard/page.tsx` reads the session via the server client, renders `user.email` + a sign-out form. `signOut` server action lives in `app/(app)/dashboard/actions.ts`._
  - _No OAuth callback route yet — email/password auth doesn't need one. T-3.4 (route protection) is the next ticket and will be a thin layer of route-group-level redirect rules atop the proxy already in place._
- [ ] **T-3.4** Middleware `middleware.ts` that redirects unauthenticated users from `/(app)/*` to `/login`
- [ ] **T-3.5** Logout action + user menu placeholder in topbar

---

## Phase 4 — App Shell 🤖

- [x] **T-4.1** App layout `app/(app)/layout.tsx` with sidebar + topbar (Monday-inspired)
  - _Server Component layout fetches user, falls back to `redirect('/login')`. Composition inlined (no separate `app-shell.tsx`) — `flex min-h-screen` with `<Sidebar />` aside + main column wrapping `<Topbar />` and `{children}`. `min-w-0 + overflow-x-clip` on the flex column (pathguide pattern) so wide tables won't push the sidebar around._
  - _`signOut` action moved from `app/(app)/dashboard/actions.ts` to `lib/auth/actions.ts` — reused by both topbar and (eventually) user menu._
- [x] **T-4.2** Sidebar nav: Dashboard, Customers, (View toggle later)
  - _240px wide on desktop (`md:flex`); brand wordmark "Circle" with border-b; nav items use `LayoutDashboard` and `Users` from lucide-react with active highlighting via `usePathname` (`bg-secondary` + font-medium when active, muted otherwise; 150ms transition). Spacer pushes the user area to the bottom._
  - _Bottom user area uses a shared `UserMenu` component (avatar with email-initial fallback + truncated email + chevron). Dropdown header shows "Signed in as / email" + Sign out item. Server action invoked via `onClick` (Base UI's MenuItem doesn't accept `asChild`, so the form-action pattern doesn't work; onClick + server-action protocol does)._
  - _`SidebarContent` is exported separately so the topbar's mobile Sheet can render the same content (T-4.3)._
- [x] **T-4.3** Topbar: page title, search shortcut hint, user menu (avatar dropdown)
  - _h-14, sticky top-0, border-b, `bg-background/95` with backdrop-blur. Mobile menu trigger (`md:hidden`) opens a `<Sheet>` containing `<SidebarContent />`. Page title resolved from `usePathname` via a `getPageTitle` helper (Dashboard, Customers, Customer Details). ⌘K hint is a `<kbd>` placeholder (no command palette in this phase). `<ThemeToggle />` (sun/moon, mounted-guarded), `<UserMenu variant="compact" />`._
  - _Note: Base UI primitives (used by base-nova preset) don't accept `asChild` — replaced with native styling on `<SheetTrigger>` and `onClick` invocation in `UserMenu` instead of the form-action pattern._
- [x] **T-4.4** Theme tokens + dark mode toggle: review pathguide colors, settle final palette in `app/globals.css`, add `next-themes` provider in root layout, ship a theme toggle component (sun/moon icon in topbar dropdown), persist user choice
  - _Font: switched from Geist to **Questrial** (single weight 400) via `next/font/google`. Hierarchy comes from size + tracking, not weight. `--font-sans`, `--font-mono`, and `--font-heading` all resolve to Questrial._
  - _Dark mode wired via `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}` for predictable recruiter behavior. `<ThemeProvider>` wrapper at `components/shared/theme-provider.tsx`. Theme toggle button ships in T-4.3._
  - _Status CSS vars added (`--status-lead`, `--status-customer`, `--status-closed`) for both `:root` and `.dark`, matching CONCEPT.md hex spec (#3B82F6 / #10B981 / #71717A). Dark mode bumps lightness slightly for visibility. Tailwind utilities `bg-status-lead`, `text-status-customer`, etc. are available via `@theme inline` mappings._
  - _Pathguide review: brought forward `min-w-0 + overflow-x-clip` flex pattern, mobile Sheet reusing the same Sidebar component, and the UserMenu-as-shared-component split. Did NOT adopt pathguide's dark teal sidebar (#0A2420) — clashes with our zinc-neutral aesthetic; we use a light sidebar instead._
- [x] **T-4.5** Empty `dashboard/page.tsx` and `customers/page.tsx` stubs that render
  - _Dashboard: header (Dashboard / Welcome back, email) + 4-card stat grid (Total / Leads / Customers / Closed) all showing `—` with "Real numbers in Phase 9" subcaptions._
  - _Customers: header + dashed-border empty state (Users icon in muted circle, "No customers yet", disabled Add Customer button)._
  - _Root `app/page.tsx` replaced with `redirect('/dashboard')` — proxy still handles auth gating, this is the explicit route handler._

---

## Phase 5 — Customer List (Table View) 🤖

- [x] **T-5.1** `<CustomerTable>` component using shadcn table — columns: name, company, status, value, last updated
  - _Client Component. Columns: Name (font-medium), Company (muted, "—" fallback), Status (StatusBadge), Value (right-aligned, German EUR formatting via `Intl.NumberFormat('de-DE', { currency: 'EUR' })`, "—" fallback), Last updated (`formatDistanceToNow` with `de` locale + `addSuffix`). Row hover `bg-muted/50`, click navigates to `/customers/[id]`. Returns `null` when empty — page-level empty state handles that case._
- [x] **T-5.2** Status badges with status colors (Lead blue, Customer green, Closed gray)
  - _`STATUS_CONFIG` map exported from `components/customers/status-badge.tsx` — single source of truth for label + CSS var + Tailwind className. Each status uses the matching `bg-status-X/10` + `text-status-X` + `border-status-X/30` (Linear-style subtle pills, not solid blocks). Reused by Kanban in T-8._
- [x] **T-5.3** Status filter tabs above the table (`All | Leads | Customers | Closed`) with counts
  - _Page (Server Component) awaits `searchParams`, passes filtered list + unfiltered counts down. Skip the second (count) query when no filters are active. Tab change updates `?status=...` via `router.replace` (no scroll, no history pollution); "All" deletes the param._
- [x] **T-5.4** Search input — filters by name, email, company (debounced 200ms)
  - _Local state for instant UI response; debounced URL update at 200ms via inline `useDebouncedCallback` hook (ref-based, ~15 lines). Empty input deletes the `search` param. Server-side filtering via `listCustomers({ search })`; `escapeIlike` already neutralises `%`/`_`/`\` in `lib/db/customers.ts`._
- [x] **T-5.5** Click row → navigate to `customers/[id]`
  - _Row navigation via `useRouter().push()`. Detail page at `app/(app)/customers/[id]/page.tsx` is a Server Component: awaits `params` (Next 16 requirement), fetches `getCustomer`, calls `notFound()` if missing. Renders back link, header with name + company + StatusBadge, Card with field grid (email, phone, value, created, updated — German absolute date format), disabled Edit/Delete buttons (`title` attr "Coming in Phase 6"), and a placeholder "Notes coming in Phase 7" panel._
- [x] **T-5.6** Sort by column header click (name, value, last updated)
  - _State lives inside `CustomerTable` (sort happens in-memory on the already-fetched array via `useMemo`). Default `updated_at DESC`. Clicking the active field flips direction; clicking a new field resets to desc. ChevronUp / ChevronDown next to the active header. Status and Company columns are not sortable (kept simple per spec)._

---

## Phase 6 — Customer CRUD 🤖

- [x] **T-6.0** Persist sort state in URL (Phase-5 follow-up)
  - _`CustomerTable` is now controlled — sort props + `onSortChange` callback. `CustomerList` propagates URL updates via `router.replace` (no scroll, no history pollution). Page parses `?sort=` and `?dir=` from `searchParams` and validates against the field/direction unions. Default `updated_at`/`desc` is omitted from the URL when active so the address bar stays clean._
- [x] **T-6.1** "Add Customer" dialog — form with Zod validation (name required, others optional)
  - _`lib/validations/customer.ts` — `customerSchema` keeps all fields as strings (HTML input shape); empty strings, decimal numbers, and email are validated via refines. `valuesToInput` in the form converts to the DB shape (empty → null, value_eur → number) at submit time. `standardSchemaResolver` (project convention since zod 4.3 broke `zodResolver` 5.2.2 typing)._
  - _`app/(app)/customers/actions.ts` — `createCustomerAction` and `updateCustomerAction` server actions auth via `createClient`, delegate to `lib/db/customers`, revalidate `/customers`, `/customers/[id]`, and `/dashboard`. Return `{ ok, error|customerId }` so callers can present errors inline._
  - _`AddCustomerDialog` + `AddCustomerButton` (Client trigger embedded in the Server page header)._
- [x] **T-6.2** Edit Customer dialog (reuses form component)
  - _Mirrors Add. `<CustomerForm key={customer.id}>` so default values reset cleanly when switching customers (relevant for T-6.5 row dropdown reuse)._
- [x] **T-6.3** Delete with confirmation dialog (`shadcn alert-dialog`)
  - _`DeleteCustomerDialog` is controlled (no trigger child — cleaner for reuse from row dropdown vs detail page button). `deleteCustomerAction` server action validates auth, delegates to `lib/db/customers`, revalidates `/customers` + `/dashboard`. Success toast: "Customer deleted". Optional `onDeleted` callback so the detail page can navigate back to `/customers`._
- [x] **T-6.4** Customer detail page `customers/[id]/page.tsx` — header, fields, edit/delete buttons
  - _`CustomerDetailActions` Client Component owns Edit + Delete dialog state. Buttons no longer disabled. Delete on detail navigates back to `/customers` (via `onDeleted`); the row-dropdown delete just relies on `revalidatePath` + `router.refresh`._
- [x] **T-6.5** Optimistic updates with Toast feedback on success/failure
  - _Row hover: 6th narrow column with `MoreHorizontal` trigger. Hidden by default on `md+`, visible on row hover/focus or while the menu is open. Always visible on touch (`opacity-100 md:opacity-0`). DropdownMenu items: Edit (Pencil) + destructive Delete (Trash2). `onClick={(e) => e.stopPropagation()}` on the cell, trigger, and content prevents the row-click navigation from firing._
  - _Each `CustomerRow` owns its own dialog state, so multiple rows can be opened independently._
  - _**Strategy chosen: pending state, not full optimistic UI.** `useTransition` + a parallel `submitting` flag drives button disable + label change. On success: `revalidatePath` (server) + `router.refresh()` (client) refetches the table. Trade-off: slight perceived latency vs the complexity of mirroring the mutation in client state and rolling back on failure. Worth it for portfolio scale (≤ a couple hundred rows where the refetch is fast). Genuine optimistic UI is a Phase 10 polish candidate._

---

## Phase 7 — Notes 🤖

- [x] **T-7.1** Notes section on customer detail — list with relative timestamps ("3 hours ago")
  - _Detail page (Server Component) fetches `listNotes(supabase, id)` after `getCustomer`. Renders `<NotesSection customerId notes>`. Each note: card-like container, `whitespace-pre-wrap` body, German relative time via `formatDistanceToNow` + `de` locale + `addSuffix`. Empty state: muted "No notes yet. Add the first one above."_
- [x] **T-7.2** Add note: textarea + submit button, instant append
  - _`NoteForm` (Client) — react-hook-form + `standardSchemaResolver`. Schema in `lib/validations/note.ts` (`z.string().trim().min(1).max(2000)`). Submit calls `addNoteAction(customerId, content)` which auth-checks, trims defensively, inserts via `lib/db/notes.createNote`, revalidates `/customers/[id]`. Toast "Note added" on success. ⌘/Ctrl + Return shortcut wired via `onKeyDown` on the Textarea — `event.metaKey || event.ctrlKey` and `event.key === "Enter"` trigger `form.handleSubmit(onSubmit)()` so the same canSubmit gate applies. Hint chip below: `⌘ + Return to add`._
- [x] **T-7.3** Delete note (hover-to-show trash icon, confirm via small popover)
  - _Hover-revealed Trash2 icon inside each note (always visible on touch). Click opens `DeleteNoteDialog` (small AlertDialog: "Delete this note?" / "This cannot be undone."). Server action `deleteNoteAction(noteId, customerId)` revalidates `/customers/[id]`. Optimistic-ish polish: confirming triggers `pointer-events-none opacity-40` on the article (150ms transition) — visual signal during the action. The fade is reset on cancel or on action error._

---

## Phase 8 — Customer Views (Table / Groups / Kanban) 🤖

> Reference: review `/Users/Ibwayi/projects/pathguide` Kanban implementation before coding the kanban portion.

- [x] **T-8.1** View switcher in customers page header (Table | Groups | Kanban toggle group, lucide icons + labels). Persisted to localStorage as `circle:customer-view-default`. Default on first load: 'table'.
  - _Lives inside `CustomerList` next to the search input. Status tabs hide in Groups/Kanban view (filtering by status is structurally redundant when columns/sections are status-bucketed). Mounted-guard reads localStorage post-mount to avoid hydration mismatch — anyone with kanban/groups saved sees a brief Table flash on first paint, then resolves._
  - _Base UI's ToggleGroup uses `value: string[]` + `onValueChange: (string[]) => void` (no Radix-style `type="single"` prop — single-select is just the default `multiple: false`)._
- [x] **T-8.2** Groups view — same data as Table but grouped by status into collapsible sections. Headers show status name + count. Each section renders the existing CustomerTable rows. All sections expanded by default; collapse state persisted per-status.
  - _`CustomerTable` gained a `hideHeader` prop so the Groups view's per-section table doesn't repeat "Name | Company | …" rows. The section header (chevron + status dot + label + count) is the visual heading._
  - _Sort URL params still apply globally — Groups uses the same URL `?sort` so all sections sort consistently. No per-group sort UI (kept simple)._
  - _Empty groups always render expanded with "No customers in this group." regardless of saved collapse state — the toggle is disabled in that case._
- [x] **T-8.3** Kanban board layout — three columns (Lead / Customer / Closed) with column headers + counts. Cards visually distinct from Groups view rows.
  - _Three columns rendered via `useDroppable`. Column headers carry a status dot + label + count. Each column body scrolls internally (`max-h-[calc(100vh-300px)]`). On mobile (< md) the columns stack horizontally with overflow-x-auto + 288px column width — industry-standard kanban behaviour. On md+ the columns become a 3-col grid with fluid widths._
- [x] **T-8.4** Customer card component for kanban — name, company, value, abbreviated status indicator (uses status border color since column header shows status).
  - _4px left border in the status colour, name (font-medium truncate), company (muted truncate), formatted EUR value at the bottom (muted "—" when null). Hover lift via `-translate-y-0.5`. The dragging variant adds a slight rotation + shadow + ring for tactile feel (Linear-style)._
- [x] **T-8.5** Drag-and-drop with `@dnd-kit/core` — drop into a column updates customer status in DB via existing `updateCustomerAction`.
  - _`PointerSensor` with `activationConstraint: { distance: 5 }` — small drag threshold so onClick still navigates on a tap._
  - _`useOptimistic` for the status update: the card moves to its new column the instant the drop fires; the surrounding `startTransition` runs `updateCustomerAction` and `router.refresh()` afterward. On error, the transition ends without changing the underlying customers prop, useOptimistic auto-drops the action, and the card snaps back. Toast.error surfaces the message._
  - _DragOverlay renders a clone of the card while dragging; the source card slot stays in place at `opacity: 0` so the column doesn't reflow under the cursor._
- [x] **T-8.6** Empty column states ("No leads yet", "No customers yet", "No closed deals yet") — minimal copy.
  - _Established in this commit's Groups view ("No customers in this group.") and reused in the Kanban columns next commit. One-line muted copy, no illustrations — fits the rest of Circle's density._

---

## Phase 9 — Dashboard 🤖

- [x] **T-9.1** Stat cards: Total / Leads / Customers / Closed (4 tiles in a row)
  - _Server Component fetches `getCustomerStats` once. 4 cards in `grid-cols-2 md:grid-cols-4`. Total has no accent; Leads/Customers/Closed each get a 2px top border in their status colour. `tabular-nums` on the number for clean alignment. Tailwind class names mapped explicitly via `ACCENT_CLASS` so the purge keeps the full strings (no `border-t-status-${accent}` templating)._
- [x] **T-9.2** Pipeline value card (sum of `value_eur` across non-closed customers)
  - _Big EUR number (German formatting via `Intl.NumberFormat`). Subtext: "Across N active deals" (leads + customers, with deal/deals pluralisation). When `pipelineValueEur === 0`: number renders as `—` in muted, subtext switches to "Add value to your customers to track pipeline."_
- [x] **T-9.3** Recent activity list (last 5 customer updates by `updated_at`)
  - _New `listRecentlyUpdated(client, limit = 5)` helper in `lib/db/customers.ts`. `<RecentActivity>` component renders a divided list inside a card: name (truncate) + StatusBadge + relative German timestamp right-aligned. Each row links to `/customers/[id]`. Empty state: muted "No activity yet. Add your first customer."_
  - _Dashboard fetches stats and recent in parallel via `Promise.all` for the same render._
- [x] **T-9.4** Quick action: "Add Customer" button reusing the dialog from T-6.1
  - _Reuses the existing `<AddCustomerButton>` Client Component (DRY — same dialog, same form, same toast pattern as `/customers`). On success, `createCustomerAction` already revalidates `/dashboard`, so stats and recent activity refresh automatically. Header is now a flex row: title + welcome on the left, button on the right._

---

## Phase 10 — Polish 🤖

**Phase 9 carryovers applied here:**
- _A — dropped "Welcome back, {email}" greeting from dashboard header._
- _B — pipeline subtext now branches on `total === 0` vs `pipelineValueEur === 0`._
- _C — Total / Leads / Customers / Closed stat cards link to `/customers[?status=…]`; hover tints to `bg-muted/50`, focus ring on the wrapping Link._

- [x] **T-10.1** Empty states everywhere (no customers, no notes, no search results)
  - _Customers list: when filtered to nothing, "No customers match your filters" + a Clear filters button (drops `?status` and `?search`, preserves `?sort` and `?dir`). Empty-no-filter: live `AddCustomerButton` (was a disabled stub). Notes empty: muted line (Phase 7). Kanban columns: per-status empty copy (Phase 8). Dashboard 0-state: pipeline + activity messaging (carryover B + Phase 9)._
- [x] **T-10.2** Loading skeletons for table, kanban, dashboard
  - _`app/(app)/dashboard/loading.tsx`, `customers/loading.tsx`, `customers/[id]/loading.tsx`. Each skeleton mirrors the loaded layout's shape so there's no shift on hydration. Uses shadcn `<Skeleton>`._
- [x] **T-10.3** Error boundaries + user-friendly error messages (no raw stack traces)
  - _`app/(app)/error.tsx` ("Something went wrong" + Try again + Go to dashboard), `app/(auth)/error.tsx` ("Couldn't load this page. Please refresh." + Try again only), `app/global-error.tsx` (root fallback with `<html>` + `<body>` + plain HTML button)._
  - _Stack traces only logged via `console.error` when `NEXT_PUBLIC_DEBUG === 'true'` — production users see only the friendly copy. `error.digest` is sent to Vercel/Sentry-style logs by Next automatically._
- [x] **T-10.4** Mobile responsive review — table → cards on small screens, kanban → vertical stack
  - _Customer table: Company hidden below `sm` (640px), Last Updated hidden below `md` (768px). At 375px the visible columns are Name + Status + Value + Actions — fits cleanly without horizontal scroll._
  - _Kanban: already horizontal-scroll on mobile (Phase 8 pattern: 288px columns + flex/overflow-x-auto). Verified._
  - _Customer detail: info card grid is 1-col by default with `sm:grid-cols-2` — fits at 375px._
  - _Mobile sidebar: opened via topbar Menu button (`md:hidden`) into a Sheet rendering `<SidebarContent>`. Verified._
  - _Auth pages: card is `max-w-[400px]` with `w-full p-4` parent — fits with margins at 375px._
- [x] **T-10.5** Toast notifications via sonner — consistent success/error patterns
  - _Audit only — no code changes needed. All call sites already follow `toast.success(short title)` for routine wins and `toast.error("Something went wrong", { description: error })` for failures. The Add Customer flow has the lone `action: { label: "View" }`. Demo button uses neutral `toast()` because it's informational, not the result of an action._
- [x] **T-10.6** Form validation messages — clear, friendly, in-form (not toast)
  - _`value_eur` → "Value must be 0 or higher." `note.content.max(2000)` → "Note can't be longer than 2000 characters." Auth schemas: tightened to "Please enter a valid email address.", "Password must be at least 8 characters.", "Passwords do not match." — consistent punctuation and full sentences._
- [x] **T-10.7** Lighthouse audit on dashboard + customer detail — fix anything <90
  - _**Static analysis** — actual Lighthouse run is to be done by you against the deployed Vercel URL post-push. Likely results based on what's in place:_
    - _Performance: ~95+. `next/font` loads Questrial with `display: swap` by default; routes are server-rendered with revalidation; bundle is small (no charts, no heavy libs)._
    - _Accessibility: ~95+. `<html lang="en">`, `aria-hidden` on decorative lucide icons, `aria-label` on icon-only buttons, focus-visible rings on shadcn components. **Watch for:** Topbar's h1 ("Dashboard") + page h2 ("Dashboard") duplicates content (valid hierarchy, but a heading audit might flag it as redundant). Tap target size on `h-8` buttons is 32px — slightly under the 48px Lighthouse recommendation but rarely flagged._
    - _Best practices: ~95+. No mixed content; HTTPS via Vercel; no console errors expected._
    - _SEO: ~90+. Title + description in metadata; viewport meta auto by Next; `<html lang>` set. No sitemap or robots.txt — for a portfolio CRM that's reached via direct link, not search, this is fine._
  - _Zero-cost fixes applied: `viewport.themeColor` set per light/dark for the mobile status bar tint._
  - _**Triage candidates if scores miss 90:** add a `manifest.json` + favicons of multiple sizes (PWA-installable), reconcile h1/h2 duplication between topbar and page._

---

## Phase 11 — Demo Account & Seed Data 🤖

- [x] **T-11.1** Seed script `scripts/seed-demo.ts` — creates demo user + ~15 German-flavored customers + notes
  - _Runs against the live Supabase project via the service role key (RLS-bypass for cross-user seeding). Idempotent: wipes notes then customers for `DEMO_USER_ID` before re-inserting 15 customers (6 leads / 6 customers / 3 closed) + 10 notes. `pnpm seed` script uses `tsx --env-file=.env.local` so the script picks up local env without a separate dotenv loader. Refactored into `lib/seed/demo-data.ts` in T-11.3 so the cron endpoint reuses the same data._
  - _Diacritic test names included (Schäfer, Müller, Köhler) to verify rendering. Edge cases seeded: a couple of customers with `null` email or phone. Pipeline value across non-closed: **€277,500** ._
- [x] **T-11.2** "Try as Demo User" button on login page — calls a server action that signs in with demo credentials
  - _Server action `signInAsDemoAction()` lives in `app/(auth)/actions.ts`. Reads `DEMO_USER_EMAIL` + `DEMO_USER_PASSWORD` from env (returns generic "Demo isn't configured" if either is missing), calls `supabase.auth.signInWithPassword`, redirects on success. Errors are sanitized — only "Couldn't sign in to the demo account." reaches the client; the upstream Supabase error is logged server-side. The password never appears in any return value, toast, or response._
  - _Login page restructured: demo button is now PRIMARY (full-width, `size="lg"`, Sparkles icon, with subtext "Explore the CRM with sample data — no signup needed"). Divider "or sign in with your account" follows. Email/password form stays below with smaller muted labels and an outline submit button so it visually steps back. Footer link "New to Circle? Create an account."_
  - _Signup page gains a small muted line at the top: "Just want to look around? Try the demo first." linking to `/login`._
- [ ] **T-11.3** Demo refresh strategy: cron-like reset (Vercel Cron or Supabase scheduled function) — resets demo data nightly
- [ ] **T-11.4** Disable destructive actions for demo user OR wipe-and-reseed nightly (decide trade-off, document in DECISIONS.md)

---

## Phase 12 — Documentation 🤖

- [ ] **T-12.1** Take 4–5 screenshots: login (with demo button visible), dashboard, customer list, kanban, customer detail. Save in `docs/`
- [ ] **T-12.2** Write `README.md` — hero screenshot, what it does, features, tech stack, architecture decisions, local setup, deploy instructions
- [ ] **T-12.3** Write `LICENSE` (MIT)
- [ ] **T-12.4** Final pass on `DECISIONS.md` — ensure 3–5 ADRs are documented (RLS choice, server actions vs API routes, kanban library, etc.)

---

## Phase 13 — Deploy & Launch 🤖🔧

- [ ] **T-13.1** Set production env vars in Vercel (Supabase URL, anon key, service role key for seed) — all three environments
- [ ] **T-13.2** First production deploy from `main` branch
- [ ] **T-13.3** 🔧 Add `crm.ibwayi.com` as custom domain in Vercel project settings — verify HTTPS
- [ ] **T-13.4** Production smoke test: signup, login, demo login, add customer, drag in kanban, add note, delete customer
- [ ] **T-13.5** 🔧 Pin repo on GitHub profile + add to LinkedIn "Featured" section
- [ ] **T-13.6** 🔧 Update ibwayi.com `/demos/mvp` page to link to crm.ibwayi.com as the live demo

---

## Post-Launch (Optional)

- [ ] Loom demo video (60–90 sec walkthrough) — embed link in README
- [ ] Twitter/LinkedIn launch post with screenshots
- [ ] Add to portfolio site / personal website

---

## Completion Notes

Use this section to log things that deviated from plan, surprises, or learnings:

- _[Add notes here as tickets complete]_
