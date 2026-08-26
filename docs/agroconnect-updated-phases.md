# AGROCONNECT — CONSOLIDATED DEVELOPMENT PHASES

This file is the consolidated execution reference for the current AgroConnect roadmap.

Phases 1–6 remain governed by their existing approved definitions and are not changed by the AgriAcademy refactor documented below.

The AgriAcademy refactor changes the Academy-related phases to a YouTube-based architecture. Bunny is removed from AgriAcademy immediately. Academy videos are hosted on YouTube as **Unlisted** videos. AgroConnect stores only the YouTube reference and course/enrollment metadata.

Important YouTube limitation: an Unlisted YouTube video can be watched by anyone who obtains its URL. AgroConnect can require authentication and enrollment before displaying the learning experience, but cannot guarantee that an Unlisted URL cannot be shared outside AgroConnect.

#======== PHASE [7] ======#
# AgriAcademy Foundation — YouTube Architecture

Lead Agent: `@07-agriacademy`
Model: **Claude Sonnet**
Supporting Agents: `@03-authorization`, `@02-identity`, `@04-media`, `@11-qa`

## Objective

Establish the AgriAcademy foundation using YouTube as the external video hosting platform.

## Architecture

```text
Course
  └── Chapter
       └── Lesson
            └── YouTube Video Reference
```

Each lesson references one YouTube video.

AgroConnect stores the YouTube video reference/ID and relevant metadata. It does not store video binary data.

## YouTube

- YouTube visibility: **Unlisted**.
- Instructor uploads the video directly to YouTube.
- Instructor pastes the YouTube URL into AgroConnect.
- AgroConnect validates the URL and extracts the Video ID.
- AgroConnect embeds the video through the YouTube player.
- No local video upload.
- No Bunny.
- No Academy video storage.

## Course lifecycle

```text
DRAFT → PUBLISHED → PAUSED → PUBLISHED
   │                     │
   └──────── DELETE ◄────┘
```

A published course cannot be deleted directly. It must first be paused/removed from publication.

## Authorization

Course creation and instructor management remain restricted to:

- Pro
- Business
- Enterprise

Student functionality, including **My Courses**, is available to every authenticated user regardless of plan.

## Enrollment

```text
User
  ↓
Enrollment
  ↓
Course
```

Any authenticated user can enroll in a published course.

After successful enrollment, the student is routed to the course learning experience.

## Ordering

Chapter ordering is database-backed:

```text
01
02
03
```

Lesson ordering is scoped to its chapter:

```text
01.01
01.02
01.03
02.01
02.02
```

Displayed numbers are derived from `sort_order`; they are not primary identities.

## Access

Before displaying the protected learning experience, verify:

- authenticated user
- valid enrollment
- course availability

Do not claim that enrollment technically protects an Unlisted YouTube URL from external sharing.

## Bunny removal

Remove Academy-specific Bunny:

- API integration
- upload
- playback
- storage
- processing
- Bunny IDs
- Bunny asset lifecycle
- Bunny cleanup

Do not introduce Bunny as a fallback.

## Validation

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Do not modify unrelated domains.

#======== PHASE [7.1] ======#
# AgriAcademy Course Authoring & Guided YouTube Workflow

Lead Agent: `@07-agriacademy`
Model: **Claude Sonnet**
Supporting Agents: `@03-authorization`, `@02-identity`, `@11-qa`

## Objective

Transform Course Creator into a complete YouTube-based course authoring workflow and guide the instructor through what to do next.

## Course structure

```text
Course
 ├── Chapter 01
 │    ├── Lesson 01
 │    └── Lesson 02
 └── Chapter 02
      ├── Lesson 01
      └── Lesson 02
```

## Guided course workflow

The Course Creator must clearly communicate:

- where the instructor is
- what is completed
- what should be done next
- what remains before publication

The workflow is a **guide, not a rigid wizard**. The instructor may return to and edit any previous step.

Recommended flow:

```text
STEP 1 — Create Course
        ↓
STEP 2 — Create Chapters
        ↓
STEP 3 — Create Lessons
        ↓
STEP 4 — Add YouTube Videos
        ↓
STEP 5 — Validate & Preview
        ↓
STEP 6 — Save Lessons
        ↓
STEP 7 — Review Course
        ↓
STEP 8 — Publish Course
```

Use clear states:

- `✓` Completed
- `●` Current/recommended next step
- `○` Pending

## Lesson YouTube workflow

```text
Create Lesson
     ↓
Paste YouTube URL
     ↓
Validate URL
     ↓
Extract YouTube Video ID
     ↓
Preview Video
     ↓
Save Lesson
```

The instructor does not upload video files.

## URL validation

Support common YouTube video URL forms, including:

- `youtube.com/watch?v=...`
- `youtu.be/...`

Reject:

- malformed URLs
- channels
- playlists
- arbitrary external URLs

Normalize the URL and persist the YouTube Video ID.

## One video per lesson

Each lesson has one YouTube video reference.

A YouTube video may be reused by multiple lessons/courses.

## Preview

After validation:

- display a YouTube preview
- display thumbnail where available
- display the extracted video ID
- allow the instructor to confirm/save

## Course readiness

Before publishing, validate:

- course title
- description
- chapters
- lessons
- required YouTube video references
- valid course structure

If a required lesson has no valid YouTube video, publication must be blocked and the missing item must be identified.

## Draft

The instructor must receive a database-confirmed save state:

```text
Saving...
   ↓
Database confirms
   ↓
✓ Draft saved
```

Never display success before persistence.

## Course lifecycle and deletion

- Draft → Delete allowed.
- Paused → Delete allowed.
- Published → Direct Delete forbidden.
- Published → Pause/remove publication → explicit confirmation → Delete.

Deleting a course never deletes a YouTube video.

## No Bunny / no storage

Remove all Academy-specific:

- local video upload
- Bunny upload
- Bunny playback
- Bunny processing
- video storage
- storage quota
- Bunny media library

## Validation

Test:

- course creation
- chapter/lesson creation
- URL validation
- Video ID extraction
- preview
- save
- replacement
- removal
- reuse
- publication validation
- pause/unpause
- delete lifecycle

#======== PHASE [7.2] ======#
# AgriAcademy Dashboard — Course Creator & My Courses

Lead Agent: `@07-agriacademy`
Model: **Claude Sonnet**
Supporting Agents: `@03-authorization`, `@05-agriprofile`, `@11-qa`

## Final AgriAcademy sidebar

```text
AgriAcademy
├── Course Creator
└── My Courses
```

Remove:

- Videos
- Storage
- Students

## Course Creator

Course Creator contains:

- create course
- edit course
- chapters
- lessons
- YouTube URL management
- YouTube preview
- draft
- publish
- pause/unpause
- delete/archive
- course readiness
- published course overview
- enrollment/student information

## Guided dashboard

When opening a draft course, show a progress area such as:

```text
✓ Course information
✓ Chapters
● Add lessons
○ Add YouTube videos
○ Review course
○ Publish
```

Display one clearly identifiable **Next Step** action.

Examples:

- no course → `Start by creating your first course.`
- no chapters → `Create your first chapter.`
- no lessons → `Add lessons to your chapters.`
- lesson without video → `Add a YouTube video to Lesson 01.01.`
- ready → `Your course is ready to publish.`

Progress must be derived from persisted course data and must survive reload.

## No storage

Remove the Academy Storage card completely.

Academy does not store video files.

## No Videos sidebar

Video management happens inside Course Creator through YouTube URL entry.

## No Students sidebar

Student information is contextual inside Course Creator.

Published course cards display:

- course title
- number of enrolled students
- View Students action

The student list displays:

- student email
- enrollment date

Only the authorized course owner/instructor may see this information.

## My Courses

My Courses contains courses in which the current user is enrolled.

It does not mean courses created by the user.

Any authenticated user may access My Courses, including Basic users.

Course Creator remains restricted to Pro, Business and Enterprise instructors.

## Enrollment state

Public course card states:

```text
Not enrolled:
[Inscrever-se]

Enrolled:
✓ Inscrito
[Continuar curso]
```

Enrollment state must come from the database, not localStorage or browser state.

## Validation

Test:

- sidebar
- My Courses for Basic users
- Course Creator authorization
- guided progress
- published course cards
- student counts
- student list
- enrollment state
- no Videos/Storage/Students entries

#======== PHASE [7.2.1] ======#
# AgriAcademy Instructor Editor Stabilization

Lead Agent: `@07-agriacademy`
Model: **Claude Sonnet**
Supporting Agents: `@03-authorization`, `@11-qa`

## Objective

Stabilize:

- chapter ordering
- lesson ordering
- draft persistence
- YouTube video changes
- publish
- pause/unpause
- delete/archive
- error handling
- React Server Component errors

## Ordering fix

The database is authoritative.

For chapter creation, calculate `sort_order` from actual database rows for the course.

For lesson creation, calculate `sort_order` from actual database rows for the chapter.

Repair existing duplicate ordering and enforce parent-scoped uniqueness where appropriate:

```text
course_id + sort_order
section_id + sort_order
```

Do not use a global unique `sort_order`.

## Guided workflow persistence

Workflow state must be reconstructed from persisted course data after reload.

It must include, where relevant:

- course metadata
- chapter order/content
- lesson order/content
- YouTube references
- publication readiness

## YouTube mutations

When adding/replacing/removing a lesson video:

1. authorize instructor
2. validate YouTube URL where applicable
3. extract Video ID
4. persist the relationship
5. confirm database persistence
6. refresh the persisted course tree

Removing a video sets the lesson reference to null. It does not affect YouTube.

## Error handling

Audit all course mutations:

- update course
- save draft
- create/update/delete chapter
- create/update/delete lesson
- YouTube assignment/removal
- publish
- pause
- resume
- delete

Do not interpret `null`, `undefined`, or failed DB operations as success.

React error #441 must be diagnosed at its underlying Server Component/action/database source. Do not suppress the error.

## Course deletion

Add a destructive `Delete Course` action.

Rules:

```text
DRAFT → DELETE
PAUSED → DELETE
PUBLISHED → CANNOT DELETE
```

For a published course:

```text
Delete Course
      ↓
Warning: course is published
      ↓
Remove from publication
      ↓
Database confirms PAUSED
      ↓
Second confirmation
      ↓
Delete permanently
```

The server must retrieve the current database status and reject deletion if the course is published. Do not trust client-side status.

Deleting a course must not delete any YouTube video.

## Public catalogue

After pausing, the course must no longer appear in the public published catalogue.

## Validation

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Regression-test ordering, YouTube changes, save, publish, pause, resume, delete, and error handling.

#======== PHASE [8] ======#
# AgriAcademy Student Learning Experience

Lead Agent: `@07-agriacademy`
Model: **Claude Sonnet**
Supporting Agents: `@04-media`, `@03-authorization`, `@05-agriprofile`, `@11-qa`

## Objective

Provide the student learning experience using the YouTube embedded player.

## My Courses

Query:

```text
Current User
  ↓
Enrollment
  ↓
Course
```

Any authenticated user may access My Courses regardless of subscription.

## Registration

Anonymous user:

```text
Inscrever-se
 ↓
Clerk Sign-up
 ↓
Return to intended course
 ↓
Enrollment
 ↓
Learning page
```

Authenticated user:

```text
Inscrever-se
 ↓
Enrollment
 ↓
Learning page
```

After successful enrollment, immediately route the student to the course learning experience.

## Already enrolled

When AgriAcademy loads, retrieve enrollment from the database.

Display:

```text
✓ Inscrito
[Continuar curso]
```

Do not use browser cache or client-only state as the source of truth.

## Learning page

Display:

```text
Course
 ├── Chapter 01
 │    ├── Lesson 01
 │    └── Lesson 02
 └── Chapter 02
      └── Lesson 01
```

Each lesson has one YouTube embedded video.

## Player

Use the normal YouTube player controls:

- Play
- Pause
- Seek
- Volume
- Fullscreen

There is **no separate AgroConnect lesson-level pause state**.

## Access control

Before rendering the learning interface verify:

- authenticated user
- valid enrollment
- course availability

An Unlisted YouTube URL may still be shared outside AgroConnect. Document this limitation.

## Student progress

If progress is implemented, track AgroConnect progress independently from YouTube hosting. Do not depend on Bunny.

## Validation

Test:

- anonymous registration
- authenticated enrollment
- already-enrolled state
- My Courses
- learning route
- YouTube player
- unauthorized/non-enrolled access
- paused-course behavior
- lesson navigation

#======== PHASE [9] ======#
# Advanced AgriAcademy Instructor Studio

Lead Agent: `@07-agriacademy`
Model: **Claude Sonnet**
Supporting Agents: `@03-authorization` (**Claude Opus security review**), `@11-qa`

## Objective

Turn Course Creator into a professional Instructor Studio without rebuilding Phase 7.1/7.2.

## Dashboard

Show:

- draft courses
- published courses
- paused courses
- archived courses
- enrollment counts
- courses requiring attention

## Advanced guided editor

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

## YouTube workflow

```text
Paste YouTube URL
 ↓
Validate
 ↓
Extract Video ID
 ↓
Preview
 ↓
Save
```

No local upload and no Bunny.

## Course readiness

Show:

```text
✓ Course information
✓ Chapters
✓ Lessons
✓ YouTube videos
✓ Course structure
```

A required missing/invalid YouTube reference prevents publication.

## Lifecycle

```text
DRAFT → PUBLISHED
PUBLISHED → PAUSED
PAUSED → PUBLISHED
DRAFT → DELETE
PAUSED → DELETE
PUBLISHED → MUST PAUSE BEFORE DELETE
```

## Enrollment visibility

Published course cards show the number of enrolled students.

`View Students` displays:

- email
- enrollment date

Only authorized course owners/instructors can access student information.

## Security review

`@03-authorization` / Claude Opus must review:

- ownership
- RLS
- enrollment access
- student privacy
- course access
- IDOR risks
- YouTube URL handling

## No storage

Do not implement Academy video storage, upload or Bunny quota.

#======== PHASE [10] ======#
# AgriService + Localization — Academy Integration

Lead Agent: `@09-localization`
Model: **Claude Sonnet**
Supporting Agents: `@08-agriexpert`, `@05-agriprofile`, `@03-authorization`, `@11-qa`

## Provider integration

`/providers/[slug]` displays the user's published Academy courses.

Only courses with:

```text
status = PUBLISHED
```

are public.

Do not expose:

- draft courses
- paused courses
- archived courses
- student emails
- enrollment details
- instructor-only data
- raw internal YouTube metadata

The provider page links into the normal Academy enrollment/access flow.

## No Bunny dependency

Provider integration must not depend on Bunny.

## Testing

Verify published-course visibility and ensure student/instructor-private information is never exposed publicly.

#======== PHASE [11] ======#
# Commerce — Academy Boundary

Lead Agent: `@10-commerce`
Model: **Claude Opus**
Supporting Agents: `@06-agrishopping`, `@03-authorization`, `@11-qa`

## Academy boundary

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

## Future paid courses

If Academy courses become paid, Commerce may authorize/create the appropriate enrollment flow.

Do not create a second Enrollment model.

## Video access

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

## Financial boundary

Financial information remains in Commerce.

Do not add YouTube revenue or Academy video-storage financial logic.

#======== PHASE [12] ======#
# Production Hardening — YouTube Academy

Lead Agent: `@00-master`
Model: **Claude Opus**
Supporting Agents: `@11-qa`, `@12-docs`, `@07-agriacademy`, `@03-authorization`, affected domain agents

## Bunny removal audit

Search the repository for Academy-specific references to:

- Bunny
- bunny.net
- BunnyCDN
- Bunny video IDs
- Bunny playback
- Bunny upload
- Bunny storage
- Bunny processing

Remove obsolete Academy dependencies.

If Bunny is used by another unrelated domain, do not remove that unrelated functionality.

## YouTube security

Verify:

- URL validation
- Video ID extraction
- malformed URL rejection
- enrollment authorization
- course publication authorization
- protected learning route
- student privacy
- no unauthorized course data exposure

Use the official YouTube embedded-player architecture.

Do not allow arbitrary external iframe/video domains through the Academy lesson video field.

## Enrollment security

```text
Anonymous → cannot access learning experience
Authenticated + not enrolled → cannot access learning experience
Authenticated + enrolled → can access learning experience
```

## Course lifecycle security

Verify server-side:

```text
Published → cannot delete directly
Published → Pause → Delete
```

Client-side status must never be trusted for destructive authorization.

## Legacy Bunny data

The approved direction is **remove Bunny immediately** for AgriAcademy.

Do not build an automatic Bunny → YouTube migration.

Existing Academy courses containing Bunny references must not remain publicly published in a broken state. Remove/archive them according to the implementation plan; do not silently convert them without a valid YouTube reference.

## Performance

Avoid unnecessary YouTube API calls.

The stored Video ID should be sufficient to render the embedded player.

Do not call external YouTube APIs on every Academy page load unless an explicit feature requires it.

## Final validation

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Perform repository-wide regression checks for:

- course creation
- chapter ordering
- lesson ordering
- guided Course Creator flow
- YouTube URL validation
- YouTube player
- enrollment
- My Courses
- provider course visibility
- publish
- pause/unpause
- delete/archive
- authorization
- student privacy
- Bunny removal

No unresolved Academy Bunny dependency should remain.
