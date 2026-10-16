PHASE 9 — ADVANCED AGRIACADEMY INSTRUCTOR STUDIO

@07-agriacademy is the lead agent.
Model: Claude Sonnet

Supporting:
@03-authorization — use Claude Opus for authorization/security review
@11-qa

Source: `docs/agroconnect-updated-phases.md`

GOAL

Turn Course Creator into a professional Instructor Studio without rebuilding Phase 7.1/7.2.

DASHBOARD

Show:

- draft courses
- published courses
- paused courses
- archived courses
- enrollment counts
- courses requiring attention

ADVANCED GUIDED EDITOR

Support:

- chapter reorder
- lesson reorder
- chapter collapse/expand
- lesson preview
- YouTube preview
- replace YouTube video
- remove YouTube video
- readiness validation
- draft state
- last saved state
- unsaved changes
- next-step guidance

The guided flow remains a guide, not a rigid wizard.

YOUTUBE WORKFLOW

```text
Paste YouTube URL → Validate → Extract Video ID → Preview → Save
```

No local upload and no Bunny.

COURSE READINESS

Show:

```text
✓ Course information
✓ Chapters
✓ Lessons
✓ YouTube videos
✓ Course structure
```

A required missing/invalid YouTube reference prevents publication.

LIFECYCLE

```text
DRAFT → PUBLISHED
PUBLISHED → PAUSED
PAUSED → PUBLISHED
DRAFT → DELETE
PAUSED → DELETE
PUBLISHED → MUST PAUSE BEFORE DELETE
```

ENROLLMENT VISIBILITY

Published course cards show the number of enrolled students.

`View Students` displays:

- email
- enrollment date

Only authorized course owners/instructors can access student information.

AUTHORIZATION IS CRITICAL

Only authorized instructors/owners may modify their courses.

Never rely only on UI restrictions.

Enforce authorization at:

- server/action/API layer
- database/RLS layer where applicable

SECURITY REVIEW

@03-authorization / Claude Opus must review:

- ownership
- RLS
- enrollment access
- student privacy
- course access
- IDOR risks
- YouTube URL handling

NO STORAGE

Do not implement Academy video storage, upload or Bunny quota.

PUBLIC VISIBILITY

Only published courses are visible publicly.

Provider compatibility: published courses must later be discoverable through `/providers/[slug]`. Do not implement the complete provider page here.

COMMERCE

Do not implement payment or course checkout.

VALIDATION

Test:
- ownership
- instructor authorization
- draft/public/pause transitions
- YouTube URL handling
- unauthorized modifications
- publication behavior
- student list privacy

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
