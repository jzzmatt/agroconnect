PHASE 11 — COMMERCE

> Academy update: Commerce may reference Course/Enrollment/User only. It must not reference Bunny, video storage, or video playback. See `docs/agroconnect-updated-phases.md`.


@10-commerce is the lead agent.

Supporting:
@06-agrishopping
@07-agriacademy
@03-authorization
@11-qa

GOAL

Create the centralized Commerce domain.

Commerce owns financial/transactional state.

RESPONSIBILITIES

- cart
- checkout
- orders
- payments
- transaction state
- seller/provider transaction records
- commissions
- earnings
- financial reporting

IMPORTANT DOMAIN BOUNDARY

AgriService does NOT own:
- earnings
- payments
- checkout
- financial records

Transport Phase 10 only creates transport requests.

Commerce may later convert an accepted/requestable offering into a transaction.

TRANSPORT

Support the transport request lifecycle established in Phase 10 without duplicating the Transport Service domain.

PRODUCTS

Integrate with AgriShopping product ownership.

ACADEMY

Commerce may reference:

- Course
- Enrollment
- User

Commerce must not reference:

- Bunny
- video storage
- video upload
- Bunny playback
- Bunny assets

If Academy courses become paid, Commerce may authorize/create the appropriate enrollment flow.

Do not create a second Enrollment model.

Commerce does not control video playback.

The Academy learning system verifies:

```text
authenticated user
+
valid enrollment
+
course availability
```

and then displays the YouTube player.

Financial information remains in Commerce.

Do not add YouTube revenue or Academy video-storage financial logic.

AUTHORIZATION

Financial operations require strict server-side authorization.

Never trust client-side prices, provider IDs, product IDs, subscription values or transaction totals.

Use database/RLS/server-side validation.

EARNINGS

Financial information should live under Commerce, not the general AgriService workspace.

Update navigation accordingly.

VALIDATION

Test:
- cart
- price integrity
- order ownership
- payment state
- seller/provider ownership
- transport transaction boundaries
- course purchase/enrollment boundaries
- authorization
- RLS
- financial calculations

Run typecheck, lint, tests and build.
