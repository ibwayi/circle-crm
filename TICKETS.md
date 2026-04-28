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
- [ ] **T-4.5** Empty `dashboard/page.tsx` and `customers/page.tsx` stubs that render

---

## Phase 5 — Customer List (Table View) 🤖

- [ ] **T-5.1** `<CustomerTable>` component using shadcn table — columns: name, company, status, value, last updated
- [ ] **T-5.2** Status badges with status colors (Lead blue, Customer green, Closed gray)
- [ ] **T-5.3** Status filter tabs above the table (`All | Leads | Customers | Closed`) with counts
- [ ] **T-5.4** Search input — filters by name, email, company (debounced 200ms)
- [ ] **T-5.5** Click row → navigate to `customers/[id]`
- [ ] **T-5.6** Sort by column header click (name, value, last updated)

---

## Phase 6 — Customer CRUD 🤖

- [ ] **T-6.1** "Add Customer" dialog — form with Zod validation (name required, others optional)
- [ ] **T-6.2** Edit Customer dialog (reuses form component)
- [ ] **T-6.3** Delete with confirmation dialog (`shadcn alert-dialog`)
- [ ] **T-6.4** Customer detail page `customers/[id]/page.tsx` — header, fields, edit/delete buttons
- [ ] **T-6.5** Optimistic updates with Toast feedback on success/failure

---

## Phase 7 — Notes 🤖

- [ ] **T-7.1** Notes section on customer detail — list with relative timestamps ("3 hours ago")
- [ ] **T-7.2** Add note: textarea + submit button, instant append
- [ ] **T-7.3** Delete note (hover-to-show trash icon, confirm via small popover)

---

## Phase 8 — Kanban View 🤖

> Reference: review `/Users/Ibwayi/projects/pathguide` Kanban implementation before coding.

- [ ] **T-8.1** Kanban board layout — three columns (Lead / Customer / Closed) with column headers + counts
- [ ] **T-8.2** Customer card component — name, company, value, abbreviated state
- [ ] **T-8.3** Drag-and-drop with `@dnd-kit/core` — drop into a column updates customer status in DB
- [ ] **T-8.4** View switcher (Table | Kanban) in the customers page header — persisted to localStorage
- [ ] **T-8.5** Empty column states ("No leads yet")

---

## Phase 9 — Dashboard 🤖

- [ ] **T-9.1** Stat cards: Total / Leads / Customers / Closed (4 tiles in a row)
- [ ] **T-9.2** Pipeline value card (sum of `value_eur` across non-closed customers)
- [ ] **T-9.3** Recent activity list (last 5 customer updates by `updated_at`)
- [ ] **T-9.4** Quick action: "Add Customer" button reusing the dialog from T-6.1

---

## Phase 10 — Polish 🤖

- [ ] **T-10.1** Empty states everywhere (no customers, no notes, no search results)
- [ ] **T-10.2** Loading skeletons for table, kanban, dashboard
- [ ] **T-10.3** Error boundaries + user-friendly error messages (no raw stack traces)
- [ ] **T-10.4** Mobile responsive review — table → cards on small screens, kanban → vertical stack
- [ ] **T-10.5** Toast notifications via sonner — consistent success/error patterns
- [ ] **T-10.6** Form validation messages — clear, friendly, in-form (not toast)
- [ ] **T-10.7** Lighthouse audit on dashboard + customer detail — fix anything <90

---

## Phase 11 — Demo Account & Seed Data 🤖

- [ ] **T-11.1** Seed script `scripts/seed-demo.ts` — creates demo user + ~15 German-flavored customers + notes
- [ ] **T-11.2** "Try as Demo User" button on login page — calls a server action that signs in with demo credentials
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
