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

## Instructor
- /[userId]/agriprofile/academy/courses/new
- /[userId]/agriprofile/academy/courses/[courseId]/edit

## Commerce
- /cart
- /checkout
- /orders
- /orders/[id]

## Migration
Existing routes must not be deleted immediately. Migrate incrementally, add redirects/adapters where appropriate, and remove deprecated routes only after replacement functionality and regression validation are complete.
