# CLAUDE.md

> This file is automatically read by Claude Code at the start of every session. Keep it concise and authoritative.

## Project: Circle

A clean, Monday-inspired CRM built as a portfolio project. Will be deployed to **crm.ibwayi.com** and linked from ibwayi.com/demos/mvp as the live demo for the "MVP App" service tier.

**Two purposes:**
1. Showcase fullstack skills for recruiters (LinkedIn, GitHub)
2. Live demo for Ibwayi clients

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database / Auth:** Supabase (Postgres + RLS + Auth)
- **Validation:** Zod
- **Package Manager:** pnpm
- **Deployment:** Vercel
- **Domain:** crm.ibwayi.com

---

## Framework Notes

Always check `AGENTS.md` before using Next.js APIs — it documents v16 breaking changes vs older training data.

Known Next 16 conventions used in this project:
- Use `proxy.ts` not `middleware.ts` (Next 16 rename — old convention deprecated). Function exported as `proxy`.
- `cookies()` from `next/headers` is async — always `await cookies()`.

Known Base UI quirks (shadcn/ui's `base-nova` preset uses `@base-ui/react`, not Radix — see ADR-008):
- **No `asChild`.** Use a `render` prop where Base UI exposes one, or inline native styles. For Button-styled links use `buttonVariants()` on `<Link>`.
- **Server actions in DropdownMenuItem** use `onClick={() => void action()}` rather than the `<form action={…}>` wrapper — `asChild` isn't available to mount the form on the item.
- **ToggleGroup** is multi-select by default; pass `value: string[]` + `onValueChange: (string[]) => void` and read `arr[0]` for single-select.
- **`form` primitive** isn't in the base-nova registry. If it ever needs reinstalling, pull from `https://ui.shadcn.com/r/styles/new-york/form.json`.

---

## Living Documents

This project uses a living-docs system. Always know what each file is for:

| File | Purpose | Update frequency |
|---|---|---|
| `CLAUDE.md` | This file. Master context. Project rules. | Rarely — only when conventions change |
| `CONCEPT.md` | Product concept: features, user flows, design direction, scope | Rarely — refer to it, don't rewrite |
| `TICKETS.md` | Living ticket plan with checkboxes | **Update after every completed ticket** |
| `DECISIONS.md` | Architecture Decision Records (ADRs) | When making a non-obvious technical choice |
| `README.md` | Public-facing project description | Built up over the project, finalized at the end |

---

## Workflow Rules (HARD RULES)

These are non-negotiable. Follow them on every task:

1. **Always read `TICKETS.md` and `CONCEPT.md` first** when starting a new ticket. Verify scope before coding.
2. **One ticket = one commit.** Atomic commits with conventional-commits format: `feat(customers): add edit dialog` / `fix(auth): resolve session refresh bug` / `chore: update tickets`.
3. **After completing a ticket, update `TICKETS.md`:**
   - Check the box `[ ]` → `[x]`
   - Add a brief completion note if the implementation deviated from the plan
   - Commit the docs update separately or include in the same commit
4. **If a ticket is unclear or seems wrong, STOP and ask** before coding. Don't silently change scope.
5. **Don't skip ahead.** Tickets are ordered for a reason (dependencies). If you think the order is wrong, propose a change first.
6. **Never commit secrets.** `.env.local` is gitignored. `.env.example` has placeholder values only.
7. **TypeScript strict mode is on. No `any`.** If you think you need `any`, use `unknown` and narrow it.
8. **Every database query goes through typed helpers in `lib/db/`.** Don't sprinkle `supabase.from(...)` calls across components.

---

## Project Structure (target)

```
circle-crm/
├── app/
│   ├── (auth)/              # login, signup
│   ├── (app)/               # protected routes
│   │   ├── dashboard/
│   │   ├── customers/
│   │   │   └── [id]/        # customer detail
│   │   └── layout.tsx       # app shell with sidebar
│   ├── api/                 # api routes (rare, prefer server actions)
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn primitives (don't edit by hand)
│   ├── customers/           # customer-specific components
│   ├── kanban/              # kanban board components
│   └── shared/              # cross-feature components
├── lib/
│   ├── supabase/            # client, server, middleware helpers
│   ├── db/                  # typed query functions
│   └── validations/         # zod schemas
├── types/
│   └── database.ts          # generated from Supabase
├── public/
└── supabase/
    └── migrations/          # SQL migration files
```

---

## Naming Conventions

- **Files:** `kebab-case.tsx` for components, `kebab-case.ts` for everything else
- **Components:** `PascalCase` exports
- **Functions:** `camelCase`
- **Database:** `snake_case` for tables and columns (Postgres convention)
- **Branches:** `feat/T-X.Y-short-description` matching the ticket ID

---

## Reference Project: Pathguide

Located at: `/Users/Ibwayi/projects/pathguide`

**Use it for:**
- Design language inspiration (look & feel, color choices, spacing)
- CRM-related code patterns (Kanban view, customer table, pipeline logic)

**Ignore in pathguide:**
- The LMS module — irrelevant for Circle

When implementing a similar feature (e.g., the Kanban board), review the pathguide implementation first, extract the patterns, then write fresh code adapted to our stack and structure. Don't copy-paste blindly.

---

## Design Direction

Clean, minimal, Monday.com-inspired. See `CONCEPT.md` for the full design brief.

Key principles:
- Whitespace > density
- Typography does the heavy lifting (Inter or Geist)
- Colors are accents, not decoration
- Subtle interactions (200ms transitions, no flashy animations)
- Empty states matter — design them, don't ship "no data"

---

## Important Constraints

- **Single-user accounts** — no team sharing in v1
- **Email/password auth only** — no magic links, no OAuth in v1 (keep onboarding friction-free for recruiters)
- **No email confirmation required** — recruiters test fast, friction kills demos
- **Demo-Login button** on the login page — one click into a populated demo account
- **German seed data** — names, companies, addresses tilted toward German locale (this is a German-market portfolio)
- **Mobile-responsive but desktop-first** — CRMs are used on desktops

---

## When in Doubt

1. Re-read `CONCEPT.md`
2. Check `TICKETS.md` for current scope
3. Look at how the previous ticket solved similar problems
4. Ask the user before introducing new dependencies or architectural changes
