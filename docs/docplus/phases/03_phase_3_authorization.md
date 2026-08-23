# Phase 3 — Authorization and Entitlements Prompt

@00-master
@03-authorization
@02-identity
@11-qa

Implement granular authorization.

Preserve existing internal subscription slug `basic`, but display Free in UI.

Separate:
- roles
- subscriptions
- entitlements

Introduce/reuse centralized APIs:
- can()
- requirePermission()
- requireEntitlement()

Target capabilities include:
- product.view/create/update/delete/publish
- academy.view/course.create/course.update/course.delete/course.publish

Free must be able to view the five major modules.
CRUD/publishing must follow entitlement rules.

Do not scatter plan-name checks.

Add authorization tests for owner/non-owner, role, subscription and entitlement cases.
