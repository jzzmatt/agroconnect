# AgriConnect Internal Implementation Strategy

A numbered phase in `docs/docplus/phases/` remains **one project phase**.

Internally, execute that phase as ordered slices. Slices are not new project phases,
not a new architecture, and not permission to start the next numbered phase.

```
Phase N (one project phase)
  NA → NB → NC → … → last slice (integration + regression)
```

This is the method. Phase 10 is the canonical example.

---

## Protocol

1. Wait for explicit human approval of the numbered phase.
2. Inspect the current repository before the first slice.
3. Execute slices in letter order. Do not skip. Do not start a later slice early.
4. A slice may only implement work already required by that phase file.
5. A slice must not implement a later slice, a later numbered phase, or unrelated domains.
6. Later slices in the same phase may consume earlier slices of that phase.
7. After each slice: validate that slice. After the last slice: run the full phase
   validation and the `11-agridev` end-of-work report.
8. Completing NG (or the last slice) completes Phase N. It does not start Phase N+1.

---

## Phase 10 — AgriService (canonical)

Lead: `@09-localization`. Supporting: `@08-agriexpert`, `@05-agriprofile`,
`@03-authorization`, `@04-media`, `@11-qa`.

```
10A — AgriService architecture + Expert
       ↓
10B — Services discovery
       ↓
10C — Transport Service
       ↓
10D — Transport Request lifecycle
       ↓
10E — /providers/[slug]
       ↓
10F — Sharing + navigation + localization
       ↓
10G — Integration + regression
```

### 10A — AgriService architecture + Expert

Establish AgriService as a public discovery layer, not a rename of AgriExpert and
not the owner of products, courses, profiles, commerce or payments.

- Public discovery available to all users.
- Publish/manage requires stored Pro / Business / Enterprise.
- Expert lists published profiles (`profile.status = published`) classified by
  professional category.
- Clicking an expert must be able to open `/providers/[slug]` later; do not build
  the full aggregation page here.

Do not implement Services listings, Transport, the provider page, sharing, or payment.

### 10B — Services discovery

Display published user services. Only published services are discoverable. Clicking
a service opens its public detail page.

Do not implement Transport, the provider page, or Commerce.

### 10C — Transport Service

Create Transport as a distinct offering domain, not a category inside Services.

Support: provider, title/description, flexible origin and destination, vehicle,
vehicle type/model, capacity/load, vehicle media, vehicle base location, price per
trip, price per load, publication state. Both pricing models exist at once.

Base location only. No live GPS. No request workflow yet. No payment.

### 10D — Transport Request lifecycle

Mini booking/request workflow: customer requests → transporter notified →
accept or reject → customer notified.

States: Pending, Accepted, Rejected, Cancelled.

This is a transport request, not a financial order. Do not implement payment or
Commerce. Do not implement the provider page.

### 10E — `/providers/[slug]`

Public read-only aggregation of that provider's published content across
AgriConnect: profile, expert, services, transport, products, courses/training.

Only published content. The page does not own those records. Each domain remains
responsible for its own data.

### 10F — Sharing + navigation + localization

Common sharing of canonical public URLs (WhatsApp, Facebook, copy link, native
Web Share where appropriate). Never share dashboard/private URLs.

Rename/remove old AgriExpert navigation. Add Transport. Remove
"Logística e Entregas". Do not put earnings under AgriService.

Use the existing Angola geographic model. Do not create a second location engine.

### 10G — Integration + regression

Full Phase 10 validation: public discovery, subscription restrictions, expert /
service / transport visibility, transport request lifecycle, provider aggregation,
published-only filtering, localization, sharing URLs, authorization, RLS.

Run typecheck, lint, tests and build.

---

## Same method for Phases 5–9, 11–12

These sequences follow the Phase 10 method. They do not change the phase files
and they do not split a phase into multiple project phases.

### Phase 5 — AgriProfile / public provider

```
5A — Publication architecture (draft / published / paused; no auto-publish)
       ↓
5B — Eligible-plan publish/manage authorization
       ↓
5C — Profile image via existing ImageKit/media
       ↓
5D — Public provider identity + stable slug
       ↓
5E — Dashboard publish / pause / resume
       ↓
5F — Public payload security (no private / subscription / auth leak)
       ↓
5G — Integration + regression
```

Do not implement full `/providers/[slug]` aggregation (Phase 10E). Do not
implement AgriService discovery (Phase 10).

### Phase 6 — AgriShopping

```
6A — Product lifecycle (Draft / Published / Paused / Deleted-Archived)
       ↓
6B — Product ↔ provider relationship (AgriProfile keeps identity)
       ↓
6C — Product media via existing ImageKit
       ↓
6D — Inventory model for later Commerce (no checkout)
       ↓
6E — Categories, localization, public product detail
       ↓
6F — Sidebar (no duplicate "Adicionar produto")
       ↓
6G — Integration + regression
```

Do not redesign AgriProfile. Do not implement checkout or the complete provider page.

### Phase 7 — AgriAcademy foundation

```
7A — Course domain + ownership
       ↓
7B — Course lifecycle (Draft / Published / Paused / Archived)
       ↓
7C — Instructor identity (reuse user/profile)
       ↓
7D — Modules, lessons, Bunny/media references
       ↓
7E — Enrollment foundation
       ↓
7F — Provider → published courses contract (no full provider page)
       ↓
7G — Integration + regression
```

Do not implement student UX, instructor authoring UI, payments, certificates, or Commerce.

### Phase 8 — AgriAcademy student

```
8A — Enrollment access + server-side authorization
       ↓
8B — /[userId]/my-courses
       ↓
8C — Lesson access + course navigation
       ↓
8D — Progress, resume, completion
       ↓
8E — AgriProfile identity (no second student identity)
       ↓
8F — Published course metadata compatibility (no full provider page)
       ↓
8G — Integration + regression
```

Do not implement payment, instructor UI, or Commerce.

### Phase 9 — AgriAcademy instructor

```
9A — Instructor ownership (API + RLS, not UI-only)
       ↓
9B — Create / edit course + draft
       ↓
9C — Modules + lessons
       ↓
9D — Course media (Bunny / approved architecture)
       ↓
9E — Preview, publish, unpublish/pause
       ↓
9F — Provider compatibility (no full provider page, no checkout)
       ↓
9G — Integration + regression
```

Do not implement payment or the complete provider page.

### Phase 11 — Commerce

```
11A — Commerce domain boundary (owns financial/transactional state)
       ↓
11B — Cart + server-side price integrity
       ↓
11C — Checkout, orders, payments
       ↓
11D — AgriShopping product integration
       ↓
11E — Academy enrollment/purchase integration
       ↓
11F — Transport request → transaction boundary; earnings / commissions
       ↓
11G — Integration + regression
```

AgriService does not own earnings, payments, checkout or financial records.
Transport requests from 10D are not orders until Commerce converts them.

### Phase 12 — Production hardening

```
12A — Subscription + authorization + cache bypass
       ↓
12B — /providers/[slug] published-only aggregation
       ↓
12C — AgriService + Transport (no payment in AgriService)
       ↓
12D — Commerce financial ownership
       ↓
12E — Security (RLS, IDOR, unauthorized mutations)
       ↓
12F — Performance
       ↓
12G — Regression, documentation, production-readiness report
```

Do not introduce new product features.

---

## Dependency reminder

Internal slices do not replace numbered-phase order:

- Phase 3 underpins 5–12.
- Phase 4 underpins 5–10.
- Phase 5 (provider identity) underpins 6–10.
- Phase 7 underpins 8 and 9.
- Phase 10 (especially 10D) underpins Phase 11 transport transactions.
- Phase 10E consumes published products and courses from Phases 6–9; it does not
  re-own those domains.
