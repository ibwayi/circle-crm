# Circle — Product Concept

## Vision

A clean, fast, no-bullshit CRM that solo founders and small teams actually want to open. Inspired by Monday's clarity and Linear's restraint. Built to demo what a modern fullstack app looks like in 2026.

---

## Target Audience

### Primary: Recruiters & Hiring Managers
They land on the GitHub repo or a LinkedIn link, click through to the live demo, spend 60 seconds clicking around, and form an impression. Optimize for the first 60 seconds.

### Secondary: Ibwayi Clients
They see this as the live demo for the "MVP App" service tier on ibwayi.com. They should think: "I want this for my business."

### Tertiary: Future Ibwayi Use
The codebase should be clean enough that the developer can fork it, customize, and deploy variants for clients without rewriting from scratch.

---

## Core Features (Must-Have)

### Authentication
- Email/password signup and login
- No email confirmation required
- Logout
- Session persistence
- Protected routes (server-side check)

### Customer Management
- Create, edit, delete customers
- Customer fields: name, email, phone, company, status, value (€), notes
- Status: `Lead` → `Customer` → `Closed`
- Customer detail page

### Views
- **Table View** (default): sortable columns, status badges, hover-to-action
- **Kanban Board View**: three columns by status, drag-and-drop to change status
- View switcher persisted per user (localStorage)

### Search & Filter
- Search by name, email, or company (real-time, no submit)
- Filter by status (tabs above the table/board)

### Notes
- Multiple notes per customer, timestamped
- Add and delete notes from the customer detail page
- Markdown not required — plain text

### Dashboard
- Total customer count
- Per-status counts (Leads / Customers / Closed)
- Total pipeline value (sum of `value_eur` across all non-closed)
- Recent activity (last 5 customer updates)

### Demo Login
- Prominent "Try as Demo User" button on login page
- One click → logged into a pre-populated demo account
- ~15 German-flavored sample customers with realistic notes
- Demo data resets nightly (or read-only — decided in T11.4)

---

## Stretch Features (Only If Time)

- CSV export
- Tags / custom labels
- Activity timeline per customer
- Email template snippets
- Dark mode

**Not stretch — explicit out of scope:**
- Multi-user / team sharing
- Real-time collaboration
- Email integration / sending
- Calendar / appointment booking
- Custom fields
- Permissions / roles
- Mobile app (web-responsive only)
- Stripe / billing (not needed for portfolio)

---

## User Flows

### Flow 1: Recruiter checks the demo (60 seconds)
1. Lands on crm.ibwayi.com
2. Sees clean login page with "Try as Demo User" button
3. Clicks it → instantly in dashboard with populated data
4. Browses dashboard stats → switches to Kanban view → drags a card → sees status update
5. Clicks a customer → sees detail page with notes
6. Closes tab, impressed.

### Flow 2: Real user adds their first customer
1. Signs up with email/password
2. Lands on empty dashboard with prominent "Add your first customer" CTA
3. Clicks → modal opens, fills name + status, saves
4. Customer appears in the table
5. Clicks the row → detail page → adds a note

### Flow 3: Manage the pipeline
1. Lands on dashboard, sees pipeline value
2. Switches to Kanban
3. Drags two leads to "Customer" → counts update
4. Closes the tab without thinking about UI

---

## Design Direction

### Inspiration
- **Monday.com** — the structural inspiration (status colors, table density, board view)
- **Linear** — the typographic discipline and motion restraint
- **Vercel Dashboard** — the dark/light balance and component polish

### Color System (light mode default)
- **Background:** very light gray (`#FAFAFA` or `#F8F9FA`)
- **Surface:** pure white with subtle borders, no heavy shadows
- **Text:** near-black (`#0A0A0A`), secondary (`#71717A`)
- **Accent (primary action):** a confident blue or violet (decided during shadcn theme setup)
- **Status colors:**
  - Lead: blue (`#3B82F6`)
  - Customer: green (`#10B981`)
  - Closed: gray (`#71717A`)

### Typography
- **Sans-serif:** Geist or Inter
- **Sizes:** keep to a small scale (12, 14, 16, 18, 24, 32)
- **Weights:** 400 body, 500 emphasis, 600 headings — no 700+

### Motion
- Transitions: 150–200ms ease-out
- No bouncy springs
- Drag-and-drop: subtle scale + shadow lift, no rotation tricks

### Empty States
Every empty state must be designed:
- No customers → big illustration + CTA "Add your first customer"
- No notes → muted text + small input
- No search results → "No customers match 'xyz'" + clear filter button

---

## Success Criteria

The project is "done" when all of the following are true:

- [ ] Live at crm.ibwayi.com with HTTPS
- [ ] Demo login works and shows populated data
- [ ] All core features work end-to-end on desktop
- [ ] Mobile usable (not pretty, but functional)
- [ ] README is publishable: hero screenshot, feature list, tech stack, local setup
- [ ] 3+ screenshots in `/docs/`
- [ ] Pinned on GitHub profile
- [ ] Linked from LinkedIn featured section
- [ ] Linked from ibwayi.com/demos/mvp
- [ ] No console errors in production
- [ ] Lighthouse score >90 on all pages

---

## Demo Strategy

The single most important thing for a recruiter visit:
**Demo Login → Pre-populated dashboard → Kanban with drag-and-drop**

If those three things work and feel polished, the rest of the project is gravy.
