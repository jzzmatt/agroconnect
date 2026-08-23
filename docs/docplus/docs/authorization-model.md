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

Free/basic:
- AgriProfile: view
- AgriShopping: view
- AgriLocalization: view
- AgriAcademy: view
- AgriExpert: view
- CRUD/publishing capabilities remain restricted according to entitlement policy.

Professional/Business/Enterprise:
- unlock the configured creation/management capabilities.

## Enforcement
Authorization must be enforced server-side.
UI checks are presentation only.

Preferred API:
- can(user, permission)
- requirePermission(user, permission)
- requireEntitlement(user, entitlement)

Never scatter checks such as `plan === "professional"` throughout the application.
