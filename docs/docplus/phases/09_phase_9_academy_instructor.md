# Phase 9 — AgriAcademy Instructor Prompt

@00-master
@03-authorization
@04-media
@07-agriacademy
@11-qa

Implement:
 /[userId]/agriprofile/academy/manage
 /[userId]/agriprofile/academy/courses/new
 /[userId]/agriprofile/academy/courses/[courseId]/edit

Instructor features:
- create/edit/delete course
- sections
- lessons
- Bunny video upload
- ordering
- draft/publish
- manage course

Creation/edit/delete/publish must be controlled by granular entitlements.
Free users can view Academy but course creation must be locked unless entitlement allows it.
