# Phase 5 — AgriProfile Prompt

@00-master
@02-identity
@03-authorization
@05-agriprofile
@11-qa

Implement the new AgriProfile workspace:
 /[userId]/agriprofile

It should aggregate:
- identity
- dashboard
- plans
- products
- KPIs
- activity
- appointments
- academy summary
- cart summary

Keep domain business logic in domain services.
Support public-vs-private profile behavior.
Migrate old dashboard/profile behavior incrementally.
Do not duplicate product/course logic inside AgriProfile.
