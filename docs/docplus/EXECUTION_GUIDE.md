# AgriConnect Phase Execution Guide

A step-by-step runbook for executing Phases 0–12, one fresh Cursor chat per phase,
delegating each phase to the subagent that owns it.

There are **13 steps (Phase 0 through Phase 12)**. Do them in numerical order.

---

## Before you start

1. Confirm `/.cursor/rules/` contains the ten `.mdc` rules and `/.cursor/agents/`
   contains the twelve subagents. The rules apply automatically; the subagents are
   invoked by name.
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

### The prompt template

Every step below uses this shape. Replace the four bracketed parts:

```
/[agent-name]

I approve running Phase [N].

Read docs/docplus/phases/[phase-file] and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: [contexts].

Inspect the existing implementation before editing. Make the smallest safe change.
Do not do anything the phase file does not ask for — stop and report instead.

When finished: run npm run typecheck, npm run lint, npm test and npm run build,
then report changed files, test results and remaining risks.
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
| 6 | 5 — AgriProfile workspace | `agriprofile` | `identity`, `authorization`, `qa` | Yes |
| 7 | 6 — AgriShopping | `agrishopping` | `authorization`, `media`, `localization`, `commerce`, `qa` | Yes |
| 8 | 7 — Academy foundation | `agriacademy` | `authorization`, `media`, `qa` | Yes |
| 9 | 8 — Academy student | `agriacademy` | `authorization`, `media`, `qa` | Yes |
| 10 | 9 — Academy instructor | `agriacademy` | `authorization`, `media`, `qa` | Yes |
| 11 | 10 — AgriExpert and Localization | `agriexpert` | `localization`, `authorization`, `qa` | Yes |
| 12 | 11 — Commerce stabilization | `commerce` | `agrishopping`, `authorization`, `qa` | Yes |
| 13 | 12 — Production hardening | `qa` | — | Yes, fixes only |

Note that `agriacademy` leads three consecutive phases (7, 8, 9) and still needs a
separate fresh chat for each. `foundation`, `agriprofile`, `agriexpert`, `commerce`
and `qa` each lead exactly one phase.

Two subagents never lead a phase. `identity` supports Phases 3 and 5, and
`localization` supports Phases 6 and 10. Invoke them directly only for a narrow,
separately approved fix inside their own domain.

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

## Step 6 — Phase 5: AgriProfile workspace

New chat.

```
/agriprofile

I approve running Phase 5.

Read docs/docplus/phases/05_phase_5_agriprofile.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @02-identity,
@03-authorization, @05-agriprofile, @11-qa.

Implement the workspace at /[userId]/agriprofile aggregating identity, dashboard,
plans, products, KPIs, activity, appointments, academy summary and cart summary.

Keep business logic in the domain services and consume them — do not duplicate product
or course logic inside AgriProfile. Support public versus private profile behaviour and
migrate the old dashboard/profile behaviour incrementally.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass, public and private profile views behave correctly, and
no product or course business rule has been reimplemented locally.

---

## Step 7 — Phase 6: AgriShopping

New chat. Widest supporting context of any phase — five domains besides its own.

```
/agrishopping

I approve running Phase 6.

Read docs/docplus/phases/06_phase_6_agrishopping.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @04-media, @06-agrishopping, @09-localization, @10-commerce, @11-qa.

Refactor the existing AgriShopping rather than rebuilding it. Preserve the existing
product data model where possible and do not duplicate cart or checkout logic.

Target product experience: optimized ImageKit image, optional optimized ImageKit short
video, mini localization, price/unit, name, category, stock, owner/vendor, and a product
detail view with vendor and localization. Vendor routes live at
/[userId]/agriprofile/products and /[userId]/agriprofile/products/[productId].

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass and existing product data still resolves. If the
subagent proposes a schema rewrite, stop and review before allowing it.

---

## Step 8 — Phase 7: Academy foundation

New chat. First of three consecutive `agriacademy` phases — each gets its own chat.

```
/agriacademy

I approve running Phase 7.

Read docs/docplus/phases/07_phase_7_academy_foundation.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @04-media, @07-agriacademy, @11-qa.

Replace the Academy prototype and mock-course flows with a durable LMS foundation:
courses, sections, lessons, enrollments, progress, course video assets, and
reviews/certificates as appropriate.

Bunny Stream is the only training-video provider. Define student and instructor
capabilities independently — a user may be both.

Establish reliable domain, data and service contracts first. Do not implement every UI
feature yet.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass, migrations are in place with RLS, and the service
contracts are stable — Phases 8 and 9 both build directly on them.

---

## Step 9 — Phase 8: Academy student

New chat.

```
/agriacademy

I approve running Phase 8.

Read docs/docplus/phases/08_phase_8_academy_student.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @04-media, @07-agriacademy, @11-qa.

Implement /[userId]/my-courses and /[userId]/my-courses/[courseId] with purchased and
enrolled courses, course overview, lesson navigation, Bunny playback, progress tracking,
resume learning, completed lessons and course completion.

Verify access server-side before any protected playback. Add regression and
authorization tests.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass and protected playback is provably unreachable without
enrollment. Test that case explicitly.

---

## Step 10 — Phase 9: Academy instructor

New chat.

```
/agriacademy

I approve running Phase 9.

Read docs/docplus/phases/09_phase_9_academy_instructor.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@03-authorization, @04-media, @07-agriacademy, @11-qa.

Implement /[userId]/agriprofile/academy/manage,
/[userId]/agriprofile/academy/courses/new and
/[userId]/agriprofile/academy/courses/[courseId]/edit with create/edit/delete course,
sections, lessons, Bunny video upload, ordering, draft/publish and manage course.

Create, edit, delete and publish must each be controlled by granular entitlements.
Free users can view Academy, but course creation must be locked unless entitlement
allows it.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass and a Free account cannot create a course through the
UI or by calling the API directly. Verify the API path, not just the UI.

---

## Step 11 — Phase 10: AgriExpert and Localization

New chat.

```
/agriexpert

I approve running Phase 10.

Read docs/docplus/phases/10_phase_10_expert_localization.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @08-agriexpert,
@09-localization, @03-authorization, @11-qa.

Integrate AgriExpert with the existing geographic infrastructure and enable
location-aware discovery for experts, services, products and relevant agricultural
resources.

Preserve the existing PostGIS hierarchy and geographic search. Do not redesign the
underlying location model without evidence.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass and existing geographic search still returns the same
results. If the location model needs changing, that is a separate approved change.

---

## Step 12 — Phase 11: Commerce stabilization

New chat.

```
/commerce

I approve running Phase 11.

Read docs/docplus/phases/11_phase_11_commerce.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master,
@06-agrishopping, @10-commerce, @03-authorization, @11-qa.

Stabilize cart, checkout, orders, payments, delivery, tracking and notifications.

Treat Commerce as shared infrastructure. Do not move cart business logic into
AgriProfile and do not redefine product ownership. Preserve existing working flows
unless you find a concrete defect — report defects before changing behaviour.

Never trust client-provided prices, ownership or seller IDs; resolve them server-side.

When finished: run npm run typecheck, npm run lint, npm test and npm run build, then
report changed files, test results and remaining risks.
```

**Gate:** all four commands pass, prices and seller IDs are resolved server-side, and
every behaviour change traces to a reported defect.

---

## Step 13 — Phase 12: Production hardening

New chat. Final step.

```
/qa

I approve running Phase 12.

Read docs/docplus/phases/12_phase_12_hardening.md and execute it.
Load only these contexts from docs/docplus/CONTEXT_MAP.md: @00-master, @11-qa.

Validate authentication, authorization, RLS, media security, Bunny protected playback,
ImageKit upload security, API validation, performance, caching, SEO, accessibility,
i18n, mobile, error/loading/empty states, observability and regression tests.

Run npm run typecheck, npm run lint, npm test and npm run build.

Report findings by severity. Do not mark this phase complete while any critical
security or data-integrity failure remains.
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
- Phase 4 (media) underpins Phases 6–9.
- Phase 7 (academy foundation) underpins Phases 8 and 9.

---

## Rules that apply throughout

- One phase per chat. Never paste two phase prompts into the same conversation.
- Approval is per phase. A subagent that has finished Phase 7 has no standing approval
  for Phase 8; the new chat and new approval line are what grant it.
- No subagent may start a phase without your explicit approval for that specific phase —
  this is enforced by the phase gate in every agent prompt and in
  `.cursor/rules/00-master.mdc`.
- Do not let a subagent modify a domain it does not own. Cross-domain work goes through
  the owning domain's public contracts, or becomes its own step.
- Commit at every gate, so a failed phase can be rolled back to a known-good state.
