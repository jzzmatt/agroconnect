PHASE 7 — AGRIACADEMY FOUNDATION

@07-agriacademy is the lead agent.

Supporting:
@03-authorization
@04-media
@02-identity
@11-qa

GOAL

Establish the LMS/domain architecture for AgriAcademy.

Create the foundational domain model for:
- courses
- instructors
- modules/sections
- lessons
- course media
- publication state
- enrollment foundation
- course ownership

COURSE LIFECYCLE

Design a clear lifecycle:

Draft
Published
Paused/Unpublished
Archived

Only published courses are publicly discoverable.

INSTRUCTOR

Instructor identity must reference the existing user/profile identity.

Do not create a duplicate user identity model.

PUBLIC PROVIDER COMPATIBILITY

The future:

/providers/[slug]

must be able to display courses published by that provider.

Therefore expose a clean domain relationship:

Provider/User
    -> Published Courses

Do not implement the complete Provider page yet.

MEDIA

Prepare the Academy domain for Bunny/approved media infrastructure.

Do not create an independent video architecture.

DO NOT IMPLEMENT YET

- complete student experience
- instructor authoring UI
- payments
- certificates
- full Commerce

Those belong to later phases.

VALIDATION

Test:
- course ownership
- publication state
- instructor authorization
- public visibility
- media references
- RLS

Run typecheck, lint and tests.
