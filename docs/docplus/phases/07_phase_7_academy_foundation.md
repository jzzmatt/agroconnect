PHASE 7 — AGRIACADEMY FOUNDATION — YOUTUBE ARCHITECTURE

@07-agriacademy is the lead agent.
Model: Claude Sonnet

Supporting:
@03-authorization
@02-identity
@04-media
@11-qa

Source: `docs/agroconnect-updated-phases.md`

GOAL

Establish the AgriAcademy foundation using YouTube as the external video hosting platform.

ARCHITECTURE

```text
Course
  └── Chapter
       └── Lesson
            └── YouTube Video Reference
```

Each lesson references one YouTube video.

AgroConnect stores the YouTube video reference/ID and relevant metadata. It does not store video binary data.

YOUTUBE

- YouTube visibility: **Unlisted**.
- Instructor uploads the video directly to YouTube.
- Instructor pastes the YouTube URL into AgroConnect.
- AgroConnect validates the URL and extracts the Video ID.
- AgroConnect embeds the video through the YouTube player.
- No local video upload.
- No Bunny.
- No Academy video storage.

COURSE LIFECYCLE

```text
DRAFT → PUBLISHED → PAUSED → PUBLISHED
   │                     │
   └──────── DELETE ◄────┘
```

A published course cannot be deleted directly. It must first be paused/removed from publication.

AUTHORIZATION

Course creation and instructor management remain restricted to Pro, Business and Enterprise.

Student functionality, including **My Courses**, is available to every authenticated user regardless of plan.

ENROLLMENT

```text
User → Enrollment → Course
```

Any authenticated user can enroll in a published course.

After successful enrollment, the student is routed to the course learning experience.

ORDERING

Chapter ordering is database-backed (`01`, `02`, `03`).

Lesson ordering is scoped to its chapter (`01.01`, `01.02`, `02.01`).

Displayed numbers are derived from `sort_order`; they are not primary identities.

ACCESS

Before displaying the protected learning experience, verify:

- authenticated user
- valid enrollment
- course availability

Do not claim that enrollment technically protects an Unlisted YouTube URL from external sharing.

BUNNY REMOVAL

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

Do not modify unrelated domains.

DO NOT IMPLEMENT YET

- complete student learning UI (Phase 8)
- advanced Instructor Studio (Phase 9)
- payments / Commerce (Phase 11)
- certificates

VALIDATION

Test:
- course ownership
- publication state
- instructor authorization
- public visibility
- YouTube reference persistence
- RLS
- no Academy Bunny dependency

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
