# AgriConnect Route Map

## Public
- /
- /agriacademy
- /agrishopping
- /agriexpert
- /agrilocalizacao
- /pricing
- /about
- /sign-in
- /sign-up

## AgriProfile
- /[userId]/agriprofile
- /[userId]/agriprofile/profile
- /[userId]/agriprofile/activity
- /[userId]/agriprofile/appointments
- /[userId]/agriprofile/favorites
- /[userId]/agriprofile/settings
- /[userId]/agriprofile/products
- /[userId]/agriprofile/products/[productId]
- /[userId]/agriprofile/academy
- /[userId]/agriprofile/academy/manage

## Student
- /[userId]/my-courses
- /[userId]/my-courses/[courseId]

Student course routes sit beside `/[userId]/agriprofile` rather than beneath it, while the
instructor routes sit within it. This asymmetry is deliberate: learning is a first-class
user activity, whereas course authoring is workspace management. Do not "correct" it by
moving `my-courses` under `agriprofile`.

## Instructor
- /[userId]/agriprofile/academy/courses/new
- /[userId]/agriprofile/academy/courses/[courseId]/edit

## Commerce
- /cart
- /checkout
- /orders
- /orders/[orderNumber]
- /orders/[orderNumber]/success

The order route is keyed by `orderNumber`, matching the existing implementation. It is not
renamed to `[id]`, because decision 10 forbids gratuitous route churn.

## Migration
Existing routes must not be deleted immediately. Migrate incrementally, add redirects/adapters where appropriate, and remove deprecated routes only after replacement functionality and regression validation are complete.

Known migrations from the current implementation, per `phase-0-audit.md`:

| Existing route | Target | Note |
|---|---|---|
| `/dashboard` and `/dashboard/*` | `/[userId]/agriprofile` and children | The active implementation today |
| `/[userId]/dashboard` | `/[userId]/agriprofile` | Currently a re-export that ignores its own `userId` segment; retire rather than migrate |
| `/profile`, `/profile/edit` | `/[userId]/agriprofile/profile` | Not user-scoped today |
| `/settings` | `/[userId]/agriprofile/settings` | Not user-scoped today |
| `/dashboard/products`, `/dashboard/products/new` | `/[userId]/agriprofile/products` | Add the missing edit route |
| `/dashboard/academy/my-courses` | `/[userId]/my-courses` | Currently a stub |
| `/dashboard/academy` | `/[userId]/agriprofile/academy/manage` | Currently a video-upload demo |
