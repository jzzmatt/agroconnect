PHASE 9 — AGRIACADEMY INSTRUCTOR

@07-agriacademy is the lead agent.

Supporting:
@04-media
@03-authorization — use Claude Opus for authorization/security review
@11-qa

GOAL

Implement the instructor course-management experience.

FUNCTIONALITY

Instructor must be able to:
- create course
- edit course
- create modules
- create lessons
- upload/manage course media
- save draft
- preview
- publish
- unpublish/pause
- manage published content

AUTHORIZATION IS CRITICAL

Only authorized instructors/owners may modify their courses.

Never rely only on UI restrictions.

Enforce authorization at:
- server/action/API layer
- database/RLS layer where applicable

MEDIA

Use the approved Bunny/media architecture.

Do not create another video storage system.

PUBLIC VISIBILITY

Only published courses are visible publicly.

Provider compatibility:

Published courses must later be discoverable through:

/providers/[slug]

Do not implement the complete provider page here.

COMMERCE

Do not implement payment or course checkout.

Prepare the domain for future Commerce integration.

QA

Test:
- ownership
- instructor authorization
- draft/public transitions
- media permissions
- unauthorized modifications
- publication behavior

Run typecheck, lint and tests.
