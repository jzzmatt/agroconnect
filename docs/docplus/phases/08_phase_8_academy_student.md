PHASE 8 — AGRIACADEMY STUDENT LEARNING EXPERIENCE

@07-agriacademy is the lead agent.
Model: Claude Sonnet

Supporting:
@04-media
@03-authorization
@05-agriprofile
@11-qa

Source: `docs/agroconnect-updated-phases.md`

GOAL

Provide the student learning experience using the YouTube embedded player.

Build around the Academy domain established in Phase 7.

MY COURSES

Query:

```text
Current User → Enrollment → Course
```

Any authenticated user may access My Courses regardless of subscription.

REGISTRATION

Anonymous user:

```text
Inscrever-se → Clerk Sign-up → Return to intended course → Enrollment → Learning page
```

Authenticated user:

```text
Inscrever-se → Enrollment → Learning page
```

After successful enrollment, immediately route the student to the course learning experience.

ALREADY ENROLLED

When AgriAcademy loads, retrieve enrollment from the database.

Display:

```text
✓ Inscrito
[Continuar curso]
```

Do not use browser cache or client-only state as the source of truth.

LEARNING PAGE

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

PLAYER

Use the normal YouTube player controls:

- Play
- Pause
- Seek
- Volume
- Fullscreen

There is **no separate AgroConnect lesson-level pause state**.

ACCESS CONTROL

Before rendering the learning interface verify:

- authenticated user
- valid enrollment
- course availability

An Unlisted YouTube URL may still be shared outside AgroConnect. Document this limitation.

STUDENT PROGRESS

If progress is implemented, track AgroConnect progress independently from YouTube hosting. Do not depend on Bunny.

PROFILE INTEGRATION

Use the existing AgriProfile identity. Do not create another student identity system.

COMMERCE

Do not implement payment/checkout here. Enrollment must remain compatible with Phase 11 Commerce.

VALIDATION

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

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
