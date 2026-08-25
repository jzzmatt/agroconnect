PHASE 8 — AGRIACADEMY STUDENT EXPERIENCE

@07-agriacademy is the lead agent.

Supporting:
@04-media
@03-authorization
@05-agriprofile
@11-qa

GOAL

Implement the student learning experience and:

/[userId]/my-courses

Build around the Academy domain established in Phase 7.

FUNCTIONALITY

Implement:
- enrolled courses
- course progress
- lesson access
- resume learning
- course navigation
- completion state
- student dashboard experience

AUTHORIZATION

Students may only access courses/content they are authorized to access.

Do not expose instructor/admin functionality to students.

PROFILE INTEGRATION

Use the existing AgriProfile identity.

Do not create another student identity system.

PUBLIC PROVIDER

Do not alter /providers/[slug] unless necessary to expose published course metadata.

COMMERCE

Do not implement payment/checkout here.

The enrollment/payment relationship must remain compatible with Phase 11 Commerce.

MEDIA

Use existing approved media architecture.

VALIDATION

Test:
- enrollment
- course access
- unauthorized lesson access
- progress persistence
- completion
- provider relationship

Run typecheck, lint and tests.
