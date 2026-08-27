# Fix-Phase-11 — Transport Booking / Commerce Boundary

## Objective
Define current Transport Service booking behavior while preserving a clean boundary for future payments.

## Current MVP
There is no payment flow.

When transporter accepts:
```text
PENDING → ACCEPTED / CONFIRMED
```

Acceptance immediately means confirmed booking.

## Future payment
Do not implement:
- payment collection
- transport checkout
- payment authorization/capture
- refunds
- payouts

Any future-payment UI must be clearly `Coming Soon` and non-functional.

## Single request record
Do not create a second order system solely for transport.

Reuse the transport request/booking record.

Future boundary:
```text
Transport Request
      ↓
Transport Booking
      ↓
[Future] Payment
```

## Responsibility
Transport Service owns:
- transport catalogue
- origin/destination
- transporter/provider
- vehicle/service information
- request
- request status
- booking confirmation

Commerce owns future financial functionality and must not duplicate transport-request state.

## Status
```text
PENDING
   ├── ACCEPTED / CONFIRMED
   └── REJECTED

ACCEPTED / CONFIRMED
   ├── COMPLETED
   └── CANCELLED
```

Reuse existing project enums/schema where possible.

## Customer
Display:
- Pending
- Confirmed
- Rejected
- Completed
- Cancelled

## Transporter
Display:
- Pending Requests
- Confirmed Bookings
- Completed
- Cancelled

Acceptance updates durable DB state and both dashboard views.

## Concurrency
Prevent duplicate acceptance and conflicting state changes. Do not trust stale client status.

## Authorization
Only the assigned transporter may accept/reject. RLS must restrict access to requester and assigned transporter.

## Notifications
Acceptance should notify requester using the existing mechanism. Database state remains authoritative.

## Acceptance criteria
1. No payment is requested.
2. Acceptance immediately confirms booking.
3. Customer sees confirmed booking.
4. Transporter sees confirmed booking.
5. No duplicate order/payment system.
6. Future payment can be added without redesigning request identity.
7. Unauthorized mutation is prevented.
8. Duplicate acceptance cannot create duplicate bookings.

## Regression
Run typecheck, lint, tests and build. Verify existing Commerce functionality is unaffected.
