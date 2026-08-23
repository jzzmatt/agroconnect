# AgriConnect Authorization Model

## Three separate concepts

### Role
Describes what type of participant a user is.
Examples:
- student
- instructor
- seller
- expert
- farmer
- business
- admin

### Subscription
Describes the commercial tier.
Internal existing slug `basic` is preserved; UI may display `Free`.
Other tiers:
- professional
- business
- enterprise

#### Namespace hazard: `business`

The token `business` names both a **role** and a **subscription tier**. This is already
true in the current schema, where `UserRoleType` and `SubscriptionPlan` both contain
`business` (see `phase-0-audit.md`).

The two are unrelated values in separate namespaces. Therefore:

- Never compare a role value to a subscription value, in either direction.
- Never type a variable such that a role and a plan are interchangeable.
- Always qualify the concept at the point of use — `role: business` and
  `plan: business` are different facts about a user, and a user may have either
  without the other.

Renaming either value is a schema change and is out of scope for Phase 1. Until one is
renamed, the collision must be handled by keeping the namespaces separate in types and
in every comparison.

#### Legacy input aliases

The four tiers above are the only values the database stores. The existing normalizer also
accepts three legacy inputs and maps them forward: `free` → `basic`, `pro` →
`professional`, `premium` → `enterprise`. Preserving that normalization is part of
decision 2. Legacy values are accepted as input and never persisted.

### Entitlement
Describes a concrete capability.

Examples:
- product.view
- product.create
- product.update
- product.delete
- product.publish
- academy.view
- academy.course.create
- academy.course.update
- academy.course.delete
- academy.course.publish

## Rules
Role != Subscription != Entitlement.

Capability is not a function of subscription alone. Role, subscription and entitlement are
resolved independently and then combined into a capability decision. A subscription may
grant an entitlement; a role may be required to exercise it.

Free/basic can view all five major modules:
- AgriProfile: view
- AgriShopping: view
- Localization: view
- AgriAcademy: view
- AgriExpert: view
- CRUD/publishing capabilities remain restricted according to entitlement policy.

Professional/Business/Enterprise:
- unlock the configured creation/management capabilities.

## Ownership
The Authorization domain owns subscription resolution, entitlement resolution and the
permission guards. The Identity domain owns roles but not subscription rules.

## Enforcement
Authorization must be enforced server-side.
UI checks are presentation only.

Required API:
- can(user, permission)
- requirePermission(user, permission)
- requireEntitlement(user, entitlement)

Never scatter checks such as `plan === "professional"` throughout the application. A
capability check must name the capability it needs, never the tier that happens to grant
it today, so that changing which tier grants a capability is a single-site change.

Permission names are granular and hierarchical, as listed above. A guard asks for
`product.create`, never for a plan.
