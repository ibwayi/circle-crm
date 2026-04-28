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
- [ ] **T-1.6** Verify `pnpm build` passes and commit clean baseline

---

## Phase 2 — Database 🤖

- [ ] **T-2.1** Create `supabase/migrations/` and write migration `0001_init_schema.sql`
  - Tables: `customers`, `notes` (per CONCEPT.md schema)
  - Indexes on `user_id`, `status`, `customer_id`
- [ ] **T-2.2** Migration `0002_rls.sql` — enable RLS, write policies for both tables
- [ ] **T-2.3** Apply migrations to Supabase project (CLI or dashboard SQL editor)
- [ ] **T-2.4** Generate TypeScript types: `pnpm dlx supabase gen types typescript --project-id <id> > types/database.ts`
- [ ] **T-2.5** Build typed query helpers in `lib/db/customers.ts` and `lib/db/notes.ts` (CRUD functions, all typed)

---

## Phase 3 — Auth 🤖

- [ ] **T-3.1** Login page `app/(auth)/login/page.tsx` with email + password form (Zod validated)
- [ ] **T-3.2** Signup page `app/(auth)/signup/page.tsx`
- [ ] **T-3.3** Auth callback handler + cookie-based session
- [ ] **T-3.4** Middleware `middleware.ts` that redirects unauthenticated users from `/(app)/*` to `/login`
- [ ] **T-3.5** Logout action + user menu placeholder in topbar

---

## Phase 4 — App Shell 🤖

- [ ] **T-4.1** App layout `app/(app)/layout.tsx` with sidebar + topbar (Monday-inspired)
- [ ] **T-4.2** Sidebar nav: Dashboard, Customers, (View toggle later)
- [ ] **T-4.3** Topbar: page title, search shortcut hint, user menu (avatar dropdown)
- [ ] **T-4.4** Theme tokens + dark mode toggle: review pathguide colors, settle final palette in `app/globals.css`, add `next-themes` provider in root layout, ship a theme toggle component (sun/moon icon in topbar dropdown), persist user choice
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
