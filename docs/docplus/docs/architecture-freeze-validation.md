# Phase 1 — Architecture Freeze Validation

Record of the contradiction validation performed across the Phase 1 artifacts. Phase 1 is
documentation and rules only; no application code, schema or configuration was modified.

**Artifacts validated:** `architecture-v2.md`, `authorization-model.md`, `domain-map.md`,
`media-architecture.md`, `migration-strategy.md`, `route-map.md`.

**Validated against:** the ten locked decisions, the ten rules in `.cursor/rules/`, the
thirteen phase prompts in `docs/docplus/phases/`, and the verified current state recorded
in `phase-0-audit.md`.

---

## Locked decision coverage

| # | Decision | Before validation | Now |
| ---: | --- | --- | --- |
| 1 | AgriProfile at `/[userId]/agriprofile` | Route listed, but the canonical route was not stated in the architecture or domain map | Stated in all three |
| 2 | Preserve `basic`; UI may display `Free` | Correctly specified | Unchanged, plus legacy aliases documented |
| 3 | Roles, subscriptions, entitlements separate | Asserted, but undermined by C2 and C3 below | Contradictions resolved |
| 4 | Granular permissions | Correctly specified | Strengthened from "preferred" to "required" |
| 5 | ImageKit for product images and short video | Correctly specified | Unchanged, flagged as greenfield |
| 6 | Bunny Stream for Academy training video | Correctly specified | Unchanged, flagged as a narrowing |
| 7 | Supabase stores durable media metadata | Correctly specified | Unchanged, JSONB scope clarified |
| 8 | Remove process-local durable state in later phases | Stated as a prohibition, never sequenced | Sequenced per phase |
| 9 | Split domain types by domain | **No coverage in any artifact** | Specified in three artifacts |
| 10 | Incremental route migration | Correctly specified | Unchanged, plus a concrete migration table |

Decisions 5, 6 and 9 describe work that does not exist rather than changes to working code.
ImageKit is absent from the repository entirely, Bunny Stream currently serves product
video as well as Academy video, and domain types live in one 1,839-line module. The
artifacts now say so, so later phases do not mistake construction for substitution.

---

## Contradictions found and resolved

**C1 — Localization was placed in two different positions.**
`architecture-v2.md` nested Localization inside Core Platform, while
`.cursor/rules/01-architecture.mdc` lists it as one of seven top-level domains and
`domain-map.md` listed it flat alongside Core Platform capabilities. Resolved by adopting
the rule's seven-domain list, with Localization top-level because it owns primitives other
domains consume, and by marking in the domain map which rows are Core Platform
capabilities.

**C2 — `business` names both a role and a subscription tier.**
`authorization-model.md` listed `business` under Role and under Subscription with no
acknowledgement, directly undermining decision 3. The collision is real in the current
schema, where `UserRoleType` and `SubscriptionPlan` both contain `business`. Resolved with
an explicit namespace-hazard section carrying three prohibitions: never compare a role to a
subscription, never type them interchangeably, always qualify the concept at the point of
use. Renaming either value is a schema change and was deferred.

**C3 — Subscription had no owning domain.**
`domain-map.md` stated that Identity does not own subscription rules, and gave Authorization
"roles-to-capability resolution, entitlements" — leaving subscription resolution assigned to
nobody. Resolved by giving Authorization subscription resolution, entitlement resolution and
the capability guards, and by making Identity explicitly not own entitlements either.

**C4 — QA was listed as a business domain.**
`domain-map.md` carried a QA row, but QA appears in neither the rule's domain list nor the
architecture's. Resolved by moving QA and Documentation to a cross-cutting functions
section that owns no business behaviour.

**C5 — Recommended `metadata JSONB` contradicted the database rule.**
`media-architecture.md` recommended a `metadata JSONB` column while
`.cursor/rules/03-database.mdc` says to avoid JSONB for core relational data. Resolved by
scoping the column to provider-specific extras that carry no relational meaning, and
requiring a real column for anything queried, filtered, joined or constrained.

**C6 — The order route parameter did not match the implementation.**
`route-map.md` specified `/orders/[id]`, but the implementation uses
`/orders/[orderNumber]` and also has `/orders/[orderNumber]/success`, which the map omitted.
Adopting `[id]` would have forced a rename that decision 10 forbids. Resolved by matching
the implementation and adding the missing route.

**C7 — The phase completion gate was weaker than the rules require.**
`migration-strategy.md` allowed "tests pass or documented known failures exist", which is
looser than `.cursor/rules/08-testing.mdc` and than phase 12's prohibition on completing
with critical failures. Resolved by requiring tests to pass, and permitting a carried
failure only when it is documented, has an owning phase, and is neither a security nor a
data-integrity failure.

**C8 — The Localization domain was spelled three ways.**
`authorization-model.md` said "AgriLocalization" where other artifacts and the rules say
"Localization", against the `/agrilocalizacao` route spelling. Resolved: the domain is
"Localization"; the route keeps its Portuguese spelling.

**C9 — Decision 9 had no artifact coverage.**
Splitting domain types by domain appeared nowhere beyond an oblique "Foundation/type
refactor" line in the phase sequence. Resolved with a "Domain type organization" section in
`architecture-v2.md`, a per-domain type ownership rule in `domain-map.md`, and a cross-phase
workstream entry in `migration-strategy.md`.

**C10 — Decision 8 was prohibited but never sequenced.**
`media-architecture.md` forbade process-local durable state, but no artifact said when it
gets removed, despite "in later phases" being part of the decision. Resolved with a
"Durable state" section in `architecture-v2.md` and a per-domain sequence in
`migration-strategy.md`: media in phase 4, Academy in phases 7–9, orders, cart and
notifications in phase 11.

**C11 — An undocumented route asymmetry invited an accidental "fix".**
Instructor routes sit under `/[userId]/agriprofile/academy/`, while student routes sit at
`/[userId]/my-courses`, beside the workspace rather than within it. This matches the phase 8
and phase 9 prompts and is not a contradiction, but it was unexplained. Resolved by
documenting it as deliberate — learning is a first-class user activity, authoring is
workspace management — with an instruction not to move it.

---

## Verified consistent, no change needed

- Decisions 1, 2, 4, 5, 6, 7 and 10 were already specified correctly and consistently.
- The five modules that Free/basic may view in `authorization-model.md` match the "five
  major modules" in the phase 3 prompt.
- The twelve-step sequence in `migration-strategy.md` matches the thirteen phase prompt
  files (phase 0 is the audit and precedes the sequence).
- The ImageKit and Bunny Stream split matches `.cursor/rules/05-media.mdc` exactly,
  including the prohibition on Bunny for product short video.
- The granular permission examples match `.cursor/rules/04-authorization.mdc`.
- Server-side enforcement and presentation-only UI checks are consistent across
  `authorization-model.md`, `.cursor/rules/02-security.mdc` and `.cursor/rules/04-authorization.mdc`.

---

## Residual items requiring a decision outside Phase 1

These are recorded rather than resolved, because each needs a schema or product decision
that the architecture freeze does not have standing to make.

1. **Renaming the `business` role or the `business` tier.** A schema change. Until then the
   namespace-hazard rules in `authorization-model.md` apply.
2. **Whether legacy `free`, `pro` and `premium` aliases are accepted indefinitely** or get a
   deprecation path. They are currently accepted as input and never persisted.
3. **Whether the flat `locations` table is retired** in favour of the
   `countries → localities` hierarchy. Both exist; `phase-0-audit.md` records that the
   manual seed files populate the flat one. Phase 10 owns the consequence.
4. **Whether `media_assets` becomes the single media table** or the per-type tables
   (`product_images`, `product_videos`, `academy_videos`) remain. Phase 4 owns this;
   `.cursor/rules/05-media.mdc` and the phase 4 prompt both say to evolve rather than add a
   parallel system, which implies consolidation but does not name the target.

---

## Phase status

Phase 1 is complete. Phase 2 has not been started and requires its own explicit approval.
