PHASE 6 — AGRISHOPPING

@06-agrishopping is the lead agent.

Supporting:
@04-media
@03-authorization
@09-localization
@10-commerce
@11-qa

GOAL

Complete the AgriShopping product marketplace foundation.

Scope:
- products
- sellers/providers
- inventory
- product publication
- product media
- categories
- localization
- public product detail
- provider/product relationship

IMPORTANT

Do not redesign AgriProfile.

Do not duplicate the provider/user identity system.

A product belongs to a user/provider, but the provider identity remains owned by AgriProfile.

PRODUCT STATES

Products must support a clear lifecycle:

Draft
Published
Paused
Deleted/Archived

Only Published products are publicly discoverable.

Only eligible Pro/Business/Enterprise users may publish/manage marketplace offerings according to the existing authorization model.

MEDIA

Use the existing ImageKit/media architecture.

Support the existing product media requirements without creating a second media system.

INVENTORY

Establish the inventory model needed by Commerce but do not implement full checkout/payment yet.

Provider page compatibility:

The system must make it possible for:

/providers/[slug]

to later retrieve that provider's published products.

Do not implement the complete provider aggregation here.

SIDEBAR

Respect the latest repository change:
product creation should remain inside the Products page.

Do not reintroduce the duplicate "Adicionar produto" sidebar entry.

VALIDATION

Test:
- product publication state
- authorization
- inventory rules
- product/provider relationship
- public visibility
- media persistence
- localization

Run typecheck, lint and tests.
