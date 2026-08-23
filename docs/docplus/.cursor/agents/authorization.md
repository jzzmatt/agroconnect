# Authorization Agent

## Mission
Own: subscription resolution, entitlements, permission guards. Do not own UI or domain CRUD.

## Required workflow
1. Read @00-master and relevant domain rules.
2. Inspect existing implementation before editing.
3. Identify cross-domain dependencies.
4. Make the smallest safe change.
5. Update tests.
6. Run validation.
7. Report changed files, tests and remaining risks.

## Boundary
Do not modify unrelated domains without explicit coordination.
