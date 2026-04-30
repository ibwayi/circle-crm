# Architecture Decision Records

Decisions captured here are non-obvious technical choices. Each entry: short, dated, with the alternative considered and why we chose what we chose.

---

## ADR-001: Supabase + RLS over a custom backend
**Date:** 2026-04-28
**Status:** Accepted

### Context
Circle needs auth, a Postgres database, and per-user data isolation. Options included rolling our own Express/Fastify backend with Postgres + JWT, using Firebase, or using Supabase.

### Decision
Supabase with Row Level Security (RLS).

### Rationale
- **RLS pushes security to the database layer** — even if API code has bugs, users cannot read each other's data
- **Auth + DB + storage in one service** — fewer integration points for a portfolio MVP
- **Postgres** (not Firestore) — relational schema fits CRM domain naturally; SQL is well-understood
- **Type generation** — `supabase gen types` gives us end-to-end type safety without ORM overhead
- **Cost** — free tier covers everything we need for portfolio + early production

### Alternatives considered
- **Custom Express + Postgres + JWT:** more flexibility but 5x the code for the same outcome
- **Firebase:** Firestore is wrong shape for relational CRM data; auth is good but vendor lock-in is heavier
- **Drizzle/Prisma + neon/planetscale:** more moving parts, more to deploy, no built-in RLS

### Consequences
- We're tied to Supabase's auth model — switching providers later means rewriting auth
- RLS means every table needs explicit policies — easy to forget, must be tested (T-2.2 covers this)
- Free tier project pauses after 7 days of inactivity — we'll mitigate with a keep-alive cron if needed

---

## ADR-002: Next.js App Router with Server Components
**Date:** 2026-04-28
**Status:** Accepted

### Context
Next.js supports two routing paradigms: Pages Router (legacy) and App Router (modern, with React Server Components). We need to pick one for Circle.

### Decision
App Router with Server Components as the default; Client Components only where interactivity is needed.

### Rationale
- **Default to server-rendered, opt into client** — pages are fast by default, no flash of loading
- **Native async/await in components** — Supabase queries directly in pages, no useEffect dance
- **Server Actions** — form submissions without API route boilerplate
- **Industry direction** — Pages Router is in maintenance mode; new Next.js features ship to App Router

### Alternatives considered
- **Pages Router:** more documentation, more familiar, but legacy
- **Different framework (Remix, SvelteKit):** good options, but Next + Vercel is the optimal portfolio signal for the German market

### Consequences
- Some shadcn/Supabase examples assume Pages Router and need translation
- Caching defaults are aggressive (Next 14+ behavior) — will need explicit `revalidatePath` after mutations

---

## ADR-003: Three customer views (Table, Groups, Kanban)
**Date:** 2026-04-29
**Status:** Accepted

### Context
The original plan called for two views — a Table and a Kanban. After Phase 5 review the gap between them felt wrong: Table is for scanning, Kanban is for pipeline workflow, but neither serves "I want to see structure without dragging cards around." Monday.com's "grouped table" pattern fills that gap.

### Decision
Ship three views with a single toggle: Table (flat sortable), Groups (collapsible status sections), Kanban (drag-and-drop columns). All three render the same `Customer[]` array — only the layout differs.

### Rationale
- **Each view answers a different question.** Table → "where is X?" Groups → "what's the structure?" Kanban → "what should I move?" Trying to make one view do all three results in a worse version of all three.
- **Cheap to build given existing components.** Groups reuses `<CustomerTable hideHeader>` inside collapsible sections — zero duplicated rendering logic. Kanban is the only view that needed a new component tree.
- **One toggle, three views** is a recognisable pattern (Linear, Notion, Monday all do it) — recruiters parse it immediately.

### Alternatives considered
- **Table + Kanban only** (the original plan): the gap above; Groups is a more daily-driver view than Kanban for many users.
- **Groups as the only view:** loses Kanban's drag-and-drop, which is the most demo-friendly interaction in the app.
- **One configurable view:** higher engineering cost (per-view configuration UI), worse UX (more clicks to switch).

### Consequences
- The view switcher hides status tabs in Groups/Kanban views — they're structurally redundant when sections/columns already bucket by status. Worth a small note in the UX, but not visible-broken.
- Sort URL state applies globally, but only the Table view has clickable sort headers. Switching from Table-with-sort to Groups preserves the sort silently.
- localStorage state for view preference is per-browser, not per-user. A recruiter on a fresh tab gets the default (Table). Acceptable.

---

## ADR-004: Server Actions instead of API Routes for mutations
**Date:** 2026-04-29
**Status:** Accepted

### Context
Mutations (create/update/delete customer, add/delete note, demo login) need a server-side entry point. Next.js offers two paths: traditional `app/api/*/route.ts` REST endpoints, or `"use server"` Server Actions invoked directly from Client Components.

### Decision
Server Actions for all mutations. API Routes only for programmatic endpoints (the `/api/cron/reset-demo` cron handler).

### Rationale
- **Type-safe RPC for free.** Server Actions take typed arguments and return typed results. No fetch wrapper, no JSON shape duplication, no zod-on-both-sides.
- **`revalidatePath` directly in the action** — the mutation that changes data is the same function that invalidates the cache. No separate "invalidate" call from the client.
- **No URL design tax.** Designing REST endpoints (`POST /api/customers`, `PATCH /api/customers/:id`) takes engineering thought. Server Actions are functions; they don't need URLs.
- **`<form action={serverAction}>`** progressive-enhancement works without JS, which means the simplest forms (sign-in, add customer) submit even when JavaScript fails to load.

### Alternatives considered
- **API Routes:** familiar to anyone who's built Express/Fastify, well-documented, but adds boilerplate (route handler + client-side fetch + JSON shape).
- **tRPC:** type-safe RPC over HTTP, but Server Actions cover the same surface area without the extra dep. tRPC shines in non-Next stacks; in Next 15+, it's redundant.

### Consequences
- Server Actions are a Next-specific abstraction. Migrating to a different framework (Remix, SvelteKit) would require rewriting them as REST endpoints.
- The `/api/cron/reset-demo` endpoint exists because cron callers can't invoke Server Actions; it's a REST endpoint by necessity.
- Error handling pattern: actions return `{ ok: true | false, ...payload }`. Throwing in an action surfaces as an unhandled error to the caller — only used for sentinel cases (auth missing).

---

## ADR-005: useOptimistic over manual optimistic state for kanban DnD
**Date:** 2026-04-29
**Status:** Accepted

### Context
Drag-and-drop on the Kanban board needs instantaneous visual feedback when a card lands in a new column — the user shouldn't wait 300ms for the round-trip before seeing the move. There's a server action to call (`updateCustomerAction`), and on failure the card needs to snap back.

### Decision
Use React 19's `useOptimistic` hook to mirror status changes against the server-provided `customers` prop. The drag handler runs `addOptimistic` inside a `startTransition`, then awaits the server action. Success: revalidatePath updates the prop, the optimistic action becomes the base state seamlessly. Failure: the transition ends without the prop changing, useOptimistic auto-drops the action, the card snaps back.

### Rationale
- **Auto-rollback is free.** No manual "if error, undo this state change" code path. Less to get wrong.
- **No duplicate state.** Server data is the source of truth; optimistic updates are an overlay that React reconciles automatically.
- **Built-in for React 19.** No library, no abstraction tax.

### Alternatives considered
- **Manual override map** (`Map<customerId, newStatus>`): explicit and debuggable, but requires writing rollback logic and reasoning about when to clear overrides after server confirmation.
- **No optimistic UI** (just disable the column during the request): simpler but worse UX — even 200ms of latency makes drag-and-drop feel unresponsive.
- **SWR/TanStack Query mutate-then-rollback:** would work, but the rest of Circle uses Server Components for data fetching, so adding a client cache layer would be inconsistent.

### Consequences
- `useOptimistic` requires the optimistic dispatch to be inside a transition. Forgetting that = no-op. Documented inline.
- If `revalidatePath` is silently dropped server-side (we've never hit this), the optimistic state would still drop on transition end — the card would briefly snap back even though the server actually succeeded. Edge case; would manifest as a visible flicker, not data loss.
- The pattern requires React 19. Can't run on the Pages Router or Next 14.

---

## ADR-006: Demo account on shared DB with nightly reset
**Date:** 2026-04-29
**Status:** Accepted

### Context
Recruiters need to interact with Circle with realistic data. They land on `/login`, click "Try as Demo User", and should immediately see a populated CRM. They also need to be able to add/edit/delete without permanently corrupting the demo for the next visitor.

### Decision
A single shared demo user (`DEMO_USER_ID`) lives in the same Supabase project as real users. Their data resets every night at 03:00 UTC via a Vercel Cron + protected reset endpoint (`/api/cron/reset-demo`).

### Rationale
- **One project, one cost.** A separate "demo" Supabase project would double our infra footprint for the same data shape.
- **RLS still protects everyone.** The demo user can only see/edit their own rows; real users can't accidentally see demo data.
- **Recruiters get a "real" feel.** They can add a customer, drag a card, delete a note — all the destructive interactions feel real because they actually mutate the DB. Tomorrow's visitor sees a clean slate.
- **Cheap to maintain.** The reset endpoint and the seed script share the same `seedDemoData()` function — one source of truth for the sample data.

### Alternatives considered
- **Read-only demo:** simpler (no reset, no cron, no service role) but breaks the demo. Recruiters can't experience the kanban drag, the form flow, or the delete confirmation. The interactivity *is* the demo.
- **Separate demo project** (a fresh Supabase deployment for demo only): cleanly isolates demo data but doubles ops. Not worth it for a portfolio piece.
- **In-memory demo** (no DB writes; mock state in the client): would avoid all the seed/reset machinery, but we'd lose the "this is a real CRM" signal. Forms would feel hollow.
- **Per-visitor user** (auto-create a temp user on demo click): works but pollutes the auth.users table over time and complicates the seed (which would need to run per signup, not nightly).

### Consequences
- The reset is destructive: recruiters mid-session at 03:00 UTC have their changes wiped. Realistic risk is near-zero (overlap with European mornings is small) but worth mentioning.
- `CRON_SECRET` MUST be set in Vercel env vars; without it, Vercel's cron call falls through to a 401 and the demo never refreshes. Defense in depth, but worth a runbook entry.
- The service role key is now used by both the local seed script AND the cron endpoint. Both are server-only contexts; the key never reaches the browser.

---

## ADR-007: proxy.ts (Next 16) instead of middleware.ts
**Date:** 2026-04-29
**Status:** Accepted

### Context
Next.js 16 deprecated the `middleware.ts` file convention and renamed it to `proxy.ts`. The old name still works (deprecated, not removed), but the function is now expected to be exported as `proxy` rather than `middleware`. Supabase's official SSR documentation still uses `middleware.ts` examples, as do most blog posts and tutorials.

### Decision
Use `proxy.ts` at the project root. Internal helper at `lib/supabase/middleware.ts` keeps the canonical Supabase name (`updateSession`).

### Rationale
- **No reason to ship a deprecated pattern.** Circle is greenfield Next 16 — every other piece is on the latest convention. Carrying `middleware.ts` would be a deliberate choice to start with tech debt.
- **The rename is the entire migration.** No new APIs to learn, no functional differences. Function signature and matcher config are identical.
- **The internal helper name is independent of the file convention.** `lib/supabase/middleware.ts` exporting `updateSession` reads naturally and matches every Supabase example online; only the root file is renamed.

### Alternatives considered
- **`middleware.ts` (deprecated):** matches Supabase docs verbatim, no mental translation needed, but ships deprecated code from day one.
- **Wait for `proxy.ts` to stabilize:** it already is — Next 16 is the stable release. Waiting buys nothing.

### Consequences
- A reader landing on the codebase via a Supabase tutorial may search for `middleware.ts` and not find it. The inline comment at the top of `proxy.ts` calls out the rename for human and AI readers alike.
- If a future Next version drops the legacy `middleware.ts` support entirely, we're already on the new convention — no migration needed.

---

## ADR-008: Stay on Base UI primitives (shadcn/ui base-nova preset)
**Date:** 2026-04-29
**Status:** Accepted

### Context
shadcn/ui's CLI underwent a preset overhaul in 2025: the old "default / new-york" style choice was replaced by named presets (`nova`, `vega`, `maia`, …). When initialised with `--defaults`, the CLI installs the `base-nova` preset, which ships its primitives backed by **Base UI** (`@base-ui/react`) rather than the original Radix UI. Most online tutorials, copy-paste components, and Stack Overflow answers still assume Radix conventions.

### Decision
Keep the `base-nova` preset and adapt to Base UI's API. Do not re-init with a Radix-based style or vendor primitives by hand.

### Rationale
- **The preset is integrated end-to-end.** components.json, generated `cn()`, theme tokens in `globals.css`, font registrations, and every primitive we've added (button, dialog, dropdown-menu, sheet, alert-dialog, table, tabs, sonner, skeleton, form, select, toggle-group, …) all assume the same primitive library. Re-initialising mid-project would reseat all of them.
- **The API surface differences are small and documented.** We hit four concrete quirks across Phases 5–8 (listed below) and adapted in roughly twenty lines of code. Cheaper than swapping primitives.
- **Base UI is the future direction Radix's authors are moving in.** Base UI is built by the same team and is the explicit successor library. Pinning to old Radix to avoid one round of API migration would mean migrating again later.

### Alternatives considered
- **Re-init with the new-york preset (Radix-based):** clean fit with most tutorials and `asChild` works everywhere, but burns the whole Phase 1–10 component history. Component.json + globals.css + every UI file would need re-issuing.
- **Manually install Radix packages alongside Base UI:** mixes two primitive libraries in one tree. Worse than either choice alone — dialogs from one, dropdowns from the other, no consistent mental model.
- **Hand-vendored primitives:** maximum control, but we'd be maintaining what shadcn maintains for free. Not worth the bookkeeping for a portfolio project.

### Consequences
Four concrete patterns we had to work around:

1. **No `asChild` prop.** Base UI uses a `render` prop instead — you pass a React element and Base UI merges its props onto it. For most call sites we just inlined classes onto a native element (`<SheetTrigger className="...">`) or applied `buttonVariants()` to a Next `<Link>` rather than wrapping a Button in a Link.
2. **Server actions in DropdownMenuItem.** The `<form action={action}><DropdownMenuItem asChild><button type="submit">…</button></DropdownMenuItem></form>` pattern doesn't work without `asChild`. We invoke server actions via `onClick={() => void action()}` instead — Next 16 still routes them through the server-action protocol correctly, the `redirect()` inside the action follows.
3. **ToggleGroup is multi-select by default.** `value: string[]` + `onValueChange: (string[]) => void` + `multiple: false` (default) for single-select. No Radix-style `type="single" value={string}` shorthand. We pass `[view]` and read `arr[0]`.
4. **`form` primitive missing in base-nova's registry.** When we ran `pnpm dlx shadcn@latest add form` it silently installed nothing — the registry entry is empty for this preset. We installed it from the new-york URL directly: `pnpm dlx shadcn@latest add https://ui.shadcn.com/r/styles/new-york/form.json`. The resulting file uses `react-hook-form` like any other shadcn form and works fine alongside the Base UI components.

If any of these stop working in a future Base UI release, the fallback is a one-shot `pnpm dlx shadcn@latest add --overwrite <component>` to pick up upstream fixes.

---

## ADR-009: Retire 1.0 customers table after Release 2.0 migration
**Date:** 2026-04-30
**Status:** Accepted

### Context
Release 2.0 replaced the 1.0 single-`customers` model with a four-entity schema: `companies`, `contacts`, `deals`, and `deal_contacts` (with notes pivoted to a polymorphic FK in 0007). Migration 0008 re-parented the demo user's existing customer rows: each `customer` became one new `contact` (1:1) and one new `deal` (1:1, stage mapped: `lead`→`lead`, `customer`→`won`, `closed`→`lost`), and notes were re-pointed at the new deal where the migration pattern fit. The customers table, the `notes.customer_id` column, and the `_migrated_from_customer_id` marker column on contacts were preserved through Phase 16 — an intentional choice so that `main` was deployable at every commit during the Release 2.0 ladder (Phases 14 → 21).

### Decision
With Phase 16 deployed and verified live (sidebar switched, `/customers` redirected, customer-only components removed, dashboard rebuilt around `getDealStats`), Migration 0009 drops the customers table, the marker column, and the legacy `notes.customer_id` column. The polymorphic notes CHECK constraint and ownership trigger function are simplified from four branches (customer / company / contact / deal) to three.

### Rationale
- **Two clean boundaries beat one tangled one.** Splitting the schema migration (0008) from the data-cleanup migration (0009) means each step is auditable and reversible up to a point. 0008 added without removing; 0009 removes after the new schema has carried real traffic.
- **The customers table was a constant lint to look at.** Every new entity helper (`lib/db/companies.ts`, `lib/db/deals.ts`) had a peer file (`lib/db/customers.ts`) that documented "still here, don't use." The TS type pulled the full customers row shape into every Database type unionisation. Cleaning that up is worth a migration on its own.
- **Polymorphic notes is simpler with three branches.** The four-FK CHECK and trigger function had a defensive branch for a parent type the app no longer creates. Dropping it removes a code path that could only ever be exercised by a row written before 0009 ran — a row that no longer exists post-DROP TABLE.

### Alternatives considered
- **Combine 0008 and 0009 into one migration.** Tempting from a "just do the swap" angle, but it would couple data movement to data destruction in a single non-revertible step. If anything went wrong with 0008, recovery would mean restoring backups; with the split, 0008 alone is already revertible by manually re-pointing notes.
- **Soft-delete the customers table** (rename to `_archived_customers`, keep around). Adds permanent dead schema for no production benefit; backups already exist on the 2026-04-30 pre-drop snapshot.
- **Keep `notes.customer_id` "just in case."** Defeats the purpose of polymorphic notes — every new note already chooses one of three parents, and there's no way to write a customer-arm note when the customers table is gone.

### Consequences
- The hybrid migration strategy (lead → lead, customer → won, closed → lost) is documented inline in 0008's docstring.
- Pre-drop CSV backups of `customers` and `notes` (rows where `customer_id IS NOT NULL`) were taken on 2026-04-30 (locally, not committed). They're the only recovery path for any row that didn't make it through the 0008 mapping.
- `lib/seed/demo-data.ts` is now a no-op stub — Phase 22 will rewrite it as a real 2.0 entity seed (companies + contacts + deals + polymorphic notes). Until then, the demo user's data is what 0008 left in place; the nightly cron runs without writes.
- The route table still includes `/customers` and `/customers/[id]`, but only as 307 redirects to `/deals`. Old bookmarks land somewhere useful instead of 404'ing. These stubs can be removed in any future release if needed; their cost is two two-line files.

---

## ADR-010: Polymorphic notes via three nullable FKs + CHECK constraint
**Date:** 2026-04-30
**Status:** Accepted

### Context
Release 2.0 needed notes that could attach to any one of three parent entity types — Company, Contact, or Deal. The Phase 7 design had a single `notes.customer_id` column; the new world has multiple parent types and the relationship needs to be cleanly modelled at the schema layer (so RLS, ON DELETE CASCADE, and TypeScript types all stay coherent).

### Decision
A single `notes` table with three nullable FK columns — `company_id`, `contact_id`, `deal_id` — plus a `CHECK` constraint enforcing exactly one is set. A polymorphic `notes_check_ownership()` trigger looks up the parent's `user_id` based on whichever FK is set and verifies it matches `notes.user_id`. Migrated in two steps: 0007 (add four-FK CHECK while customer_id still existed) → 0009 (drop customer_id, simplify CHECK + trigger to three branches).

### Rationale
- **Cascade behaviour stays cheap and standard.** Each FK has its own `ON DELETE CASCADE` clause; deleting a parent automatically deletes its notes via Postgres's normal FK machinery — no application code needed.
- **RLS policies are uniform.** A single `notes` row carries `user_id`; the standard `WHERE user_id = auth.uid()` policy works identically regardless of which parent type is set.
- **Types follow the column shape.** Generated Supabase types have `notes.company_id: string | null`, `contact_id: string | null`, `deal_id: string | null` — application code uses a discriminated union (`CreateNoteInput`) that the helpers translate at the FK column boundary.

### Alternatives considered
- **One notes table per parent type** (`notes_company`, `notes_contact`, `notes_deal`). Rejected — would have triplicated the query helpers (`listNotesForCompany` etc still exist, but they hit the same table), the RLS policy, the CASCADE rules, and the Phase 19 shared-component wiring. Three tables of identical shape with slightly different FK columns is duplication, not polymorphism.
- **Single `parent_id` + `parent_type` with no FK enforcement.** Rejected — loses cascade behaviour (would need an application-level cleanup pass on parent deletes), can't be enforced at the schema layer, and offers no compile-time guarantee that the right parent type is referenced. The CHECK-constraint pattern gets all of those for free.
- **A separate `note_attachments` junction table.** Rejected — adds another join for every read, and the M:0..1 cardinality (a note has exactly one parent) doesn't justify a junction.

### Consequences
- Queries must filter on the right column (`listNotesForDeal` uses `eq("deal_id", id)`, etc) — three sibling helpers in `lib/db/notes.ts` rather than a single parameterised one. The shared NotesSection component and server action handle the discrimination via a `NotesTarget` discriminated union.
- The four-column-then-three-column transition required two migrations (0007 add, 0009 simplify). Worth it: Phase 16's deploy was fully reversible up until 0009 ran.
- Adding a fourth parent type (e.g., a future `Project` entity) is a column-add migration plus an arm on the union — no schema rework.

---

## ADR-011: M:N deal contacts with `is_primary` flag (vs. `primary_contact_id` column)
**Date:** 2026-04-30
**Status:** Accepted

### Context
A deal involves one or more contacts; one of them might be the "primary" point-of-contact (shown by default on the deal card and detail page). The data model needed to express both pieces — multi-contact membership AND the singled-out primary — without internal contradictions.

### Decision
A `deal_contacts` junction table with composite primary key `(deal_id, contact_id)` and an `is_primary boolean` column. A **partial unique index** on `(deal_id) WHERE is_primary = true` enforces at-most-one-primary-per-deal at the schema layer. The cross-table `deal_contacts_check_ownership()` trigger ensures the junction's `user_id` matches both the deal's and the contact's.

### Rationale
- **One source of truth.** Every deal-contact link lives in `deal_contacts`. Whether a contact is primary or secondary is a property of the link, not a separate column on `deals`.
- **Postgres enforces "at most one primary."** The partial unique index does what an application-level loop would otherwise have to: rejects a second row that tries to set `is_primary = true` for a deal that already has one. Promotion is a demote-then-promote sequence — `linkContactToDeal` and `setDealPrimaryContact` both encapsulate it.
- **Reads stay one query.** `getDeal` returns `Contact[] & { is_primary: boolean }` — UI sorts primary-first, no extra round-trip.

### Alternatives considered
- **`primary_contact_id` column on `deals` + a `deal_contacts` junction for non-primary.** Rejected — duplicates the linkage in two places; changing primary requires writes to both tables; you can write a row that contradicts itself (junction says X is on the deal, deals.primary_contact_id points to Y who isn't in the junction).
- **Array of contact UUIDs on `deals` with the first being primary.** Rejected — Postgres arrays have weak FK enforcement (no cascade behaviour), positional semantics ("first = primary") is brittle, and array indexing doesn't compose with the junction's RLS / ownership trigger pattern used by every other relationship in the schema.
- **Separate `deal_primary_contact` view + `deal_contacts` table.** Rejected — adds a derived object to sync, and the partial-unique-index pattern is the canonical Postgres solution to "at most one X."

### Consequences
- `setDealPrimaryContact` and `linkContactToDeal` (when `isPrimary: true`) must demote-then-promote in two ordered statements. Encapsulated in `lib/db/deals.ts` so callers don't have to know the dance.
- The deal detail page sorts contacts by `is_primary DESC` then by name; the kanban card surfaces only the primary via a flat `primary_contact` post-process from the nested select.
- A deal can briefly have no primary (e.g., after the only contact is removed). Acceptable per UX — the detail page renders a "no primary" hint until the user promotes another. Adding a NOT NULL invariant would force more state-machine logic on every junction edit.

---

## ADR-012: Optional company on contacts and deals (vs. required)
**Date:** 2026-04-30
**Status:** Accepted

### Context
B2B sales reality: not every contact belongs to a company, and not every deal has a company at the moment it's created. Freelancers, independent consultants, individual prospects, and "we just met at a conference" leads all need a place in the data model before the user has any company info — or sometimes ever.

### Decision
`contacts.company_id` and `deals.company_id` are nullable. The UI treats `null` as a first-class "(No company)" state — visible as a filter option on `/contacts`, supported by the deal form's combobox, and rendered with an em-dash on table rows.

### Rationale
- **Matches the user's mental model.** "Anna Schäfer, freelance UX designer" exists in the user's CRM. The contact's identity isn't a company; it's a person.
- **Deals can predate company info.** A user might log a lead from a LinkedIn message before they know which company the prospect runs. NOT NULL would force premature placeholder data.
- **Cascade behaviour stays correct.** `ON DELETE SET NULL` on the company_id FKs lets deleting a company keep its contacts and deals — they survive without the link, exactly the right behaviour for "company went away, the person is still in our world."

### Alternatives considered
- **Synthetic "Unaffiliated" pseudo-company.** Rejected — clutters the companies list with placeholder entries, and freelancers aren't "unaffiliated with their company"; they don't have one. Forces every list query to filter that one row out.
- **Two separate tables: `people` (no company) and `company_contacts` (company required).** Rejected — duplicates schema, splits the contacts UI in two, and forces application code to discriminate between two ID spaces. The freelancer/employee distinction is a property of the row, not the type.
- **Required company + a "self-employed" flag.** Rejected — same problem as the pseudo-company option, just with extra boolean.

### Consequences
- Every `listContacts` / `listDeals` query handles NULL company_id explicitly — three-state filter (`undefined` = all, `null` = no company, `string` = that company).
- The contacts UI surfaces "(No company)" as a filter chip; the deal form's contact combobox optionally scopes to the deal's company while letting the user widen to "all contacts" via a toggle.
- The cross-table ownership trigger on `deal_contacts` still works because it walks through deal → user_id and contact → user_id, neither of which depends on a company. Companies are orthogonal to the ownership check.
- A future tightening (require company on Enterprise plan, optional on Starter) is feature-flag work, not a schema change.
