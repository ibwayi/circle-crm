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
