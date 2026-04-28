# RestaurantOS — Product Requirements Document

## Original Problem Statement
Full SaaS for Algerian restaurants: Menu Maker (trilingual AR/FR/EN), QR per table, orders (dine-in + takeaway), real-time Dashboard, Kitchen, Analytics, Stock, multi-tenant JWT auth. Cash-first (DZD, no Stripe). UI in French + Arabic. Strategy/landing pages for B2B pitch.

## User Choices (2026-04-28)
- **Scope**: Full SaaS platform (orders only, no online payment)
- **Payment**: Cash only — no Stripe/Baridimob integration
- **Strategy pages**: Included
- **Auth**: JWT email/password
- **Languages**: UI in FR/AR, menu content trilingual (AR/FR/EN)

## Architecture
- **Backend**: FastAPI + MongoDB, JWT (bcrypt), seeded demo data on startup
- **Frontend**: React 19 + Tailwind + shadcn/ui + Recharts
- **Fonts**: Outfit (display) + Tajawal (body/Arabic)
- **Palette**: Harissa Orange (#F97316) on near-white, Swiss high-contrast
- **Multi-tenant**: `restaurant_id` on every record; user 1:1 restaurant in MVP

## User Personas
1. **Restaurant Owner** (Karim) — manages menu, sees dashboard, prints QR codes, reviews analytics
2. **Kitchen Staff** — views Kitchen screen, marks orders ready
3. **Customer (diner)** — scans table QR, browses menu AR/FR/EN, orders, pays in cash

## Implemented (2026-04-28)
- [x] Auth (register / login / logout / me) with JWT bearer in `localStorage.rx_token`
- [x] Multi-tenant data model: users, restaurants, categories, items, tables, orders, stock, feedback
- [x] Menu Maker — categories & items with trilingual (AR/FR/EN) name+description
- [x] QR Codes per table (base64 PNG, print-all view)
- [x] Real-time Dashboard — 4 KPIs, hourly bar chart, best sellers, active orders (15s auto-refresh)
- [x] Kitchen Display — Kanban tabs (Tout/En attente/En cours/Prêt) with elapsed timers
- [x] Orders list with status filter
- [x] Analytics — 7-day trends + peak hours
- [x] Stock management with low-threshold alerts
- [x] Settings — restaurant profile, public slug editable
- [x] Public Customer Menu at `/m/:slug?table=id` — no auth, AR/FR/EN toggle, cart, submit
- [x] Marketing Landing + Strategy pages (9 sections)
- [x] Seed data: Chez Karim restaurant, 11 Algerian dishes, 8 tables, 7 days of sample orders
- [x] Backend test suite (21/21 passing)

## Backlog

### P1 (next)
- Offline-first mode for dashboard/menu (service worker + IndexedDB cache)
- Customer feedback flow from public menu after `ready` status
- Order detail modal (admin side) with edit/cancel
- Export CSV (orders, stock) from analytics
- Multi-user per restaurant (staff roles: owner/manager/waiter/kitchen)

### P2 (later)
- Multi-branch (chaîne) support
- Loyalty/punch-card program
- Delivery integration (Yassir Express, local riders)
- WhatsApp notification to customer when order ready
- OCR menu import from photo
- Dark mode for Kitchen screen (ergonomics)

## Known notes
- Cookie-vs-bearer precedence in `get_current_user` currently prefers cookie — minor hardening item noted in test report; not blocking
- Public order endpoint has no rate-limit → add captcha/IP throttle before production
- `seed_demo` idempotency is based on admin user existence only

## Iteration 2 (2026-04-28)
- [x] Staff roles (owner/manager/kitchen/waiter) with RBAC on `/api/staff` + frontend RoleGuard
- [x] CSV exports: `/api/export/orders.csv`, `/stock.csv`, `/items.csv` + download buttons on Orders, Stock, Menu pages
- [x] Customer feedback flow: star-rating modal after order placed on `/m/:slug`, `/api/public/.../feedback` endpoint
- [x] `/app/feedback` page for owners/managers with avg rating + distribution + list
- [x] `/app/staff` page: add/edit/delete team members, role badges, modal form
- [x] Offline indicator (online/offline banner) + service worker (stale-while-revalidate for GET /api + assets)
- [x] 3 new seeded test accounts: manager, kitchen, waiter
- [x] Role-based sidebar (hides routes per role) + RoleHome (role-based default landing)
- [x] Backend tests: 50/50 passing

## Iteration 3 (2026-04-28) — OCR Menu Import
- [x] `POST /api/menu/ocr` — uploads menu photo → Groq Vision (`meta-llama/llama-4-scout-17b-16e-instruct`) → returns structured `{categories, items}` with auto-translation AR/FR/EN, prices in DZD
- [x] `POST /api/menu/ocr/apply` — writes selected items into tenant's menu (dedupes categories by fr-name, creates fallback categories for unmatched items)
- [x] Frontend: `Import par photo (IA)` button in Menu Maker → upload + preview → analyze (~3-6s) → editable table of extracted items → multi-select + apply
- [x] Landing page: new "IA intégrée" feature callout
- [x] Uses user-supplied Groq API key stored in `/app/backend/.env` (GROQ_API_KEY, GROQ_MODEL)
- [x] `DEPLOYMENT_NOTES.md` created with key-rotation reminders
- [x] RBAC: only owner + manager can use OCR endpoints
- [x] Backend tests: 59/59 passing (9 new OCR tests + 50 regression)

## Iteration 4 (2026-04-28) — Kitchen Big Screen
- [x] New route `/app/kitchen-display` (owner/manager/kitchen) — fullscreen zero-chrome 3-column Kanban
- [x] Columns: En attente (amber) / En cours (blue) / Prêt (green) with live counts
- [x] Color-coded urgency on cards: neutral 0-8 min · amber 8-15 · red + flame icon >15
- [x] Auto-refresh 5s + Web Audio beep on new pending order (no external mp3)
- [x] Big tap targets (h-16 buttons, text-2xl uppercase) — designed for wall-mounted tablet
- [x] Toggles: sound on/off, dark/light theme, fullscreen API, exit (back to /app/kitchen)
- [x] Live clock + overdue counter in header ("16 en retard")
- [x] Preferences persisted in localStorage (dark/sound)
- [x] Launch button "Mode grand écran" on regular /app/kitchen page
