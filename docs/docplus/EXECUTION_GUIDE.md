# AgriConnect Phase Execution Guide

A step-by-step runbook for executing Phases 0–12, one fresh Cursor chat per phase,
delegating each phase to the subagent that owns it.

There are **13 steps (Phase 0 through Phase 12)**. Do them in numerical order.

---

## Before you start

1. Confirm `/.cursor/rules/` contains the eleven `.mdc` rules (including
   `11-agridev.mdc`) and `/.cursor/agents/` contains the twelve subagents. The
   rules apply automatically; the subagents are invoked by name. Follow
   `.cursor/rules/11-agridev.mdc` on every phase.
2. Commit or stash any work in progress. Every phase should start from a clean tree.
3. Create a branch per phase, for example `git checkout -b phase-3-authorization`.
   Never run a phase directly on `main`.
4. Know the four validation commands — you will use them at the end of every step:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## How each step works

Each step is the same five moves:

1. **Open a new chat.** A fresh chat per phase, not a new one per subagent. This is
   deliberate: each phase must start with a clean context window so earlier phases
   do not leak in. In Cursor, open a new chat tab (`Cmd/Ctrl+N` in the chat panel).
2. **Invoke the owning subagent by name** with `/<agent-name>` as the first thing in
   your message.
3. **Give explicit approval for that specific phase.** Every subagent carries a phase
   gate and will refuse to start a numbered phase without it. Your message must say
   you approve that exact phase, otherwise the subagent will stop and ask.
4. **Let it run, then validate.** Run the four commands above. The subagent should run
   them too, but verify yourself.
5. **Gate before continuing.** Only move to the next step when validation passes and
   you have reviewed the diff. Do not batch two phases into one chat.

### Internal slices (one phase, sequential NA → NG)

A numbered phase remains one project phase. Internally execute it in the lettered
slices in `docs/docplus/IMPLEMENTATION_STRATEGY.md`. Phase 10 is the canonical
example:

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

Do not skip a slice. Do not implement a later slice early. Completing a slice does
not start the next numbered phase.

### The prompt template

Every step below uses this shape. Replace the four bracketed parts:

```
/[agent-name]

I approve running Phase [N].

Read docs/docplus/phases/[phase-file] and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: [contexts].

Inspect the existing implementation before editing. Follow .cursor/rules/11-agridev.mdc.
Execute internally in the slice order in docs/docplus/IMPLEMENTATION_STRATEGY.md.
Make the smallest safe change. Do not do anything the phase file does not ask for —
stop and report instead.

When finished: run the validation commands required by the phase file, then report
what changed, files, database changes, routes/components, tests, validation and
remaining limitations.
```

---

## Phase ownership map

The lead subagent for each phase is derived from the `@context` list declared inside
that phase's own file.

| Step | Phase | Lead subagent | Supporting contexts | Touches code? |
| ---: | --- | --- | --- | --- |
| 1 | 0 — Repository audit | `documentation` | — | No, read-only |
| 2 | 1 — Architecture freeze | `documentation` | — | No, docs and rules only |
| 3 | 2 — Foundation refactor | `foundation` | — | Yes |
| 4 | 3 — Authorization and entitlements | `authorization` | `identity`, `qa` | Yes |
| 5 | 4 — Media infrastructure | `media` | `agrishopping`, `agriacademy`, `qa` | Yes |
| 6 | 5 — AgriProfile / public provider | `agriprofile` | `identity`, `authorization`, `media`, `localization`, `qa` | Yes |
| 7 | 6 — AgriShopping | `agrishopping` | `authorization`, `media`, `localization`, `commerce`, `qa` | Yes |
| 8 | 7 — Academy foundation | `agriacademy` | `authorization`, `media`, `identity`, `qa` | Yes |
| 9 | 8 — Academy student | `agriacademy` | `authorization`, `media`, `agriprofile`, `qa` | Yes |
| 10 | 9 — Academy instructor | `agriacademy` | `authorization`, `media`, `qa` | Yes |
| 11 | 10 — AgriService | `localization` | `agriexpert`, `agriprofile`, `authorization`, `media`, `qa` | Yes |
| 12 | 11 — Commerce | `commerce` | `agrishopping`, `agriacademy`, `authorization`, `qa` | Yes |
| 13 | 12 — Production hardening | parent agent under `00-master` | `qa`, `documentation`, affected domains | Yes, hardening only |

Note that `agriacademy` leads three consecutive phases (7, 8, 9) and still needs a
separate fresh chat for each. Phase 10 is led by `localization`; `agriexpert` supports
Expert, Services and Transport domain work. Phase 12 is led by the parent agent
following `00-master` and `11-agridev`, not by a single domain subagent.

`identity` supports Phases 3, 5 and 7. Invoke a supporting agent directly only for a
narrow, separately approved fix inside its own domain.

---

## Step 1 — Phase 0: Repository audit

New chat. This is read-only; nothing should be modified.

```
/documentation

I approve running Phase 0.

Read docs/docplus/phases/00_phase_0_audit.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @12-docs.

This is a read-only forensic audit. Do not implement features and do not edit any
file except the audit report you produce.

Report: current state, architecture gaps, risks, existing assets to preserve and
migration candidates. Do not invent missing facts — if something is unknown, say so.
```

**Gate:** you have a written audit and no source file changed. Read it before Step 2 —
it is the evidence base every later phase depends on.

---

## Step 2 — Phase 1: Architecture freeze

New chat.

```
/documentation

I approve running Phase 1.

Read docs/docplus/phases/01_phase_1_architecture_freeze.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @12-docs.

This phase is documentation and rules only. Do not refactor application code.

Create or update the six artifacts in docs/docplus/docs/, then validate all
artifacts for contradictions and report any you find. Do not start Phase 2.
```

**Gate:** the six files in `docs/docplus/docs/` are current and mutually consistent,
and `git diff --stat` shows no changes under `src/` or `supabase/`.

---

## Step 3 — Phase 2: Foundation refactor

New chat. First step that touches application code.

```
/foundation

I approve running Phase 2.

Read docs/docplus/phases/02_phase_2_foundation.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @01-foundation.

Refactor only foundational architecture: split monolithic domain types by domain,
establish shared contracts, normalize service boundaries. Preserve current behaviour.
Remove dead or duplicate abstractions only where you can prove it is safe.

Do not implement AgriProfile, the ImageKit migration, the Academy LMS or any new
commerce feature.

When finished: run npm run typecheck, npm run lint, npm test and npm run build.
Document any compatibility adapter you introduce, then report changed files, test
results and remaining risks.
```

**Gate:** all four commands pass and behaviour is unchanged. This phase is a refactor —
if tests needed rewriting to pass, treat that as a red flag and investigate.

---

## Step 4 — Phase 3: Authorization and entitlements

New chat.

```
/authorization

I approve running Phase 3.

Read docs/docplus/phases/03_phase_3_authorization.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @02-identity, @11-qa.

Keep roles, subscriptions and entitlements separate. Preserve the existing internal
`basic` subscription slug while displaying Free in the UI. Route every check through
can(), requirePermission() and requireEntitlement() — do not scatter plan-name checks.

Free must be able to view the five major modules; CRUD and publishing follow
entitlement rules.

Add authorization tests covering owner, non-owner, role, subscription and entitlement
cases. When finished: run npm run typecheck, npm run lint, npm test and npm run build,
then report changed files, test results and remaining risks.
```

**Gate:** all four commands pass, and the eight-case authorization matrix from
`.cursor/rules/08-testing.mdc` has coverage — unauthenticated, authenticated, wrong
owner, correct owner, wrong role, correct role, insufficient entitlement, sufficient
entitlement. This phase underpins Phases 5 through 12; do not proceed on a partial pass.

---

## Step 5 — Phase 4: Media infrastructure

New chat.

```
/media

I approve running Phase 4.

Read docs/docplus/phases/04_phase_4_media.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @04-media,
@06-agrishopping, @07-agriacademy, @11-qa.

ImageKit handles product images, product short videos, profile/application images and
thumbnails. Bunny Stream handles AgriAcademy training videos only.

Evolve the existing media_assets table rather than creating a parallel media system.
Remove the process-local durable ProductVideoService state. Supabase is the metadata
source of truth. Prefer signed direct uploads, keep provider secrets server-side, and
implement lifecycle/error states and webhook handling where required.

Do not redesign Academy or Product UI in this phase.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass, no in-memory structure holds durable media state, and
no provider secret is reachable from client code.

---

## Step 6 — Phase 5: AgriProfile / public provider foundation

New chat.

```
/agriprofile

I approve running Phase 5.

Read docs/docplus/phases/05_phase_5_agriprofile.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @02-identity,
@03-authorization, @04-media, @05-agriprofile, @09-localization, @11-qa.
Follow .cursor/rules/11-agridev.mdc.

Refactor the current user profile into a publishable public provider profile with
draft, published and paused states. Profiles must not auto-publish. Only Pro,
Business and Enterprise may publish or manage public provider functionality; users
without an eligible subscription may still maintain a private profile.

Add profile picture support through the existing ImageKit/media abstraction. Establish
the public provider identity and stable slug required by /providers/[slug]. Do not
implement full cross-domain aggregation yet.

When finished: run npm run typecheck, npm run lint and npm test, then report what
changed, files, database changes, routes/components, tests, validation and remaining
limitations.
```

**Gate:** typecheck, lint and tests pass. Draft and paused profiles are not public;
published profiles are. Ineligible or missing subscriptions cannot publish. Public
payloads expose only intended fields.

---

## Step 7 — Phase 6: AgriShopping

New chat. Widest supporting context of any phase — five domains besides its own.

```
/agrishopping

I approve running Phase 6.

Read docs/docplus/phases/06_phase_6_agrishopping.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @04-media, @06-agrishopping, @09-localization, @10-commerce, @11-qa.
Follow .cursor/rules/11-agridev.mdc.

Complete the AgriShopping product marketplace foundation: products, inventory,
publication (Draft / Published / Paused / Deleted-Archived), product media, categories,
localization, public product detail and the product-to-provider relationship.

Do not redesign AgriProfile. Do not duplicate the provider identity system. Only
Published products are publicly discoverable. Only eligible Pro/Business/Enterprise
users may publish or manage marketplace offerings. Establish inventory for Commerce
but do not implement checkout or payment. Do not reintroduce a duplicate "Adicionar
produto" sidebar entry.

When finished: run npm run typecheck, npm run lint and npm test, then report what
changed, files, database changes, routes/components, tests, validation and remaining
limitations.
```

**Gate:** typecheck, lint and tests pass. Product publication, authorization, inventory,
provider relationship, public visibility and media persistence are covered. Existing
product data still resolves. If the subagent proposes a schema rewrite, stop and review
before allowing it.

---

## Step 8 — Phase 7: Academy foundation

New chat. First of three consecutive `agriacademy` phases — each gets its own chat.

```
/agriacademy

I approve running Phase 7.

Read docs/docplus/phases/07_phase_7_academy_foundation.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@02-identity, @03-authorization, @04-media, @07-agriacademy, @11-qa.
Follow .cursor/rules/11-agridev.mdc.

Establish the LMS domain architecture: courses, instructors, modules/sections, lessons,
course media, publication state, enrollment foundation and course ownership.

Instructor identity must reference the existing user/profile identity. Only published
courses are publicly discoverable. Expose Provider/User -> Published Courses for later
/providers/[slug] aggregation. Prepare Bunny/approved media infrastructure. Do not
implement the complete student experience, instructor authoring UI, payments,
certificates or full Commerce.

When finished: run npm run typecheck, npm run lint and npm test, then report what
changed, files, database changes, routes/components, tests, validation and remaining
limitations.
```

**Gate:** typecheck, lint and tests pass, migrations are in place with RLS, and the
service contracts are stable — Phases 8 and 9 both build directly on them.

---

## Step 9 — Phase 8: Academy student

New chat.

```
/agriacademy

I approve running Phase 8.

Read docs/docplus/phases/08_phase_8_academy_student.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @04-media, @05-agriprofile, @07-agriacademy, @11-qa.
Follow .cursor/rules/11-agridev.mdc.

Implement the student learning experience and /[userId]/my-courses: enrolled courses,
progress, lesson access, resume learning, course navigation, completion and the student
dashboard. Students may only access authorized content. Use the existing AgriProfile
identity. Do not implement payment or checkout. Do not alter /providers/[slug] unless
necessary to expose published course metadata.

When finished: run npm run typecheck, npm run lint and npm test, then report what
changed, files, database changes, routes/components, tests, validation and remaining
limitations.
```

**Gate:** typecheck, lint and tests pass. Unauthorized lesson access is blocked.
Enrollment, progress and completion persist.

---

## Step 10 — Phase 9: Academy instructor

New chat.

```
/agriacademy

I approve running Phase 9.

Read docs/docplus/phases/09_phase_9_academy_instructor.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @04-media, @07-agriacademy, @11-qa.
Follow .cursor/rules/11-agridev.mdc.

Implement the instructor course-management experience: create/edit course, modules,
lessons, media, draft, preview, publish, unpublish/pause and manage published content.

Authorization is critical. Never rely only on UI restrictions. Enforce at the
server/action/API layer and at RLS where applicable. Use Bunny/approved media
architecture. Do not implement payment or course checkout. Do not implement the
complete provider page.

When finished: run npm run typecheck, npm run lint and npm test, then report what
changed, files, database changes, routes/components, tests, validation and remaining
limitations.
```

**Gate:** typecheck, lint and tests pass. Unauthorized modifications fail at the API,
not only in the UI. Draft courses are not public.

---

## Step 11 — Phase 10: AgriService

New chat. Localization is the lead agent; `agriexpert` supports Expert, Services and
Transport domain work.

```
/localization

I approve running Phase 10.

Read docs/docplus/phases/10_phase_10_expert_localization.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @08-agriexpert,
@09-localization, @05-agriprofile, @03-authorization, @04-media, @11-qa.
Follow .cursor/rules/11-agridev.mdc.

Replace the old AgriExpert concept with AgriService using the internal slice order
in docs/docplus/IMPLEMENTATION_STRATEGY.md:

10A architecture + Expert → 10B Services → 10C Transport Service →
10D Transport Request → 10E /providers/[slug] → 10F sharing/navigation/localization →
10G integration + regression.

Public discovery is available to all users. Publishing and management require Pro,
Business or Enterprise. Implement Transport as a distinct domain (origin, destination,
vehicle, base location, price/trip, price/load, publication state) and a mini
request workflow (pending / accepted / rejected / cancelled). Do not implement live
GPS tracking, payment or Commerce.

Implement /providers/[slug] as a read-only aggregation of published profile, expert,
services, transport, products and courses. Remove "Logística e Entregas". Do not put
earnings under AgriService.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report what changed, files, database changes, routes/components, tests, validation
and remaining limitations.
```

**Gate:** all four commands pass. Only published content is discoverable. Transport
requests are not financial orders. Existing geographic search still works.

---

## Step 12 — Phase 11: Commerce

New chat.

```
/commerce

I approve running Phase 11.

Read docs/docplus/phases/11_phase_11_commerce.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@06-agrishopping, @07-agriacademy, @10-commerce, @03-authorization, @11-qa.
Follow .cursor/rules/11-agridev.mdc.

Create the centralized Commerce domain: cart, checkout, orders, payments, transaction
state, commissions, earnings and financial reporting.

AgriService does not own earnings, payments, checkout or financial records. Transport
Phase 10 only creates transport requests; Commerce may later convert an accepted
offering into a transaction. Integrate with AgriShopping product ownership and Academy
enrollment/purchase requirements. Never trust client-provided prices, provider IDs,
product IDs, subscription values or transaction totals.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report what changed, files, database changes, routes/components, tests, validation
and remaining limitations.
```

**Gate:** all four commands pass, prices and seller IDs are resolved server-side, and
financial information remains inside Commerce.

---

## Step 13 — Phase 12: Production hardening

New chat. Final step. The parent agent executes this phase under `00-master` and
`11-agridev`. Invoke `/qa` and `/documentation` as supporting agents; do not treat
this as a feature phase.

```
I approve running Phase 12.

Read docs/docplus/phases/12_phase_12_hardening.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @11-qa, @12-docs.
Follow .cursor/rules/11-agridev.mdc.

Perform production hardening and architecture review after Phases 5–11. Do not
introduce new product features.

Verify subscription semantics, /providers/[slug] published-only aggregation,
AgriService discovery vs publishing, Transport (no payment logic in AgriService),
Commerce financial ownership, security, performance and regression.

Run npm run typecheck, npm run lint, npm test and npm run build.

Report architecture health, security findings, performance findings, regression
findings, unresolved technical debt, documentation status and production readiness.
Do not mark this phase complete while any critical security or data-integrity failure
remains.
```

**Gate:** all four commands pass and zero critical findings are open.

---

## When a phase fails

Do not start the next phase. In the same chat, ask the lead subagent to diagnose and fix
within that phase's scope. If the fix belongs to a different domain, stop, open a new
chat with that domain's subagent, approve the narrow fix explicitly, then return.

If a phase turns out to depend on something an earlier phase left incomplete, go back and
finish the earlier phase first. The order exists because of these dependencies:

- Phase 3 (authorization) underpins Phases 5–12.
- Phase 4 (media) underpins Phases 5–10.
- Phase 5 (public provider identity) underpins Phases 6–10.
- Phase 7 (academy foundation) underpins Phases 8 and 9.
- Phase 10 (AgriService / Transport requests) underpins Phase 11 Commerce.

---

## Rules that apply throughout

- One phase per chat. Never paste two phase prompts into the same conversation.
- Approval is per phase. A subagent that has finished Phase 7 has no standing approval
  for Phase 8; the new chat and new approval line are what grant it.
- No subagent may start a phase without your explicit approval for that specific phase —
  this is enforced by the phase gate in every agent prompt and in
  `.cursor/rules/00-master.mdc` and `.cursor/rules/11-agridev.mdc`.
- Do not let a subagent modify a domain it does not own. Cross-domain work goes through
  the owning domain's public contracts, or becomes its own step.
- Commit at every gate, so a failed phase can be rolled back to a known-good state.
