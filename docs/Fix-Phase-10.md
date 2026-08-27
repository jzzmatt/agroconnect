# Fix-Phase-10 — AgriService Transport Requests

## Objective
Fix the Transport Service request flow so every transport request is persisted, routed to the correct transporter, and visible in the dashboard.

## Dashboard sidebar
Add:
```text
Transport Service Requests
├── Receiving Requests
└── Sending Requests
```

Use the existing localization system.

## Receiving Requests
A transporter must see requests addressed to them. Query by authenticated transporter/provider identity.

Display:
- requester/customer
- transport service
- origin
- destination
- requested date/time
- vehicle/service information
- price
- request date
- status
- available action

Statuses:
```text
PENDING
ACCEPTED / CONFIRMED
REJECTED
COMPLETED
CANCELLED
```

When the transporter accepts, the request immediately becomes a confirmed booking for the MVP.

## Sending Requests
The requester sees requests they sent, queried by authenticated requester identity.

Display:
- transporter/provider
- transport service
- origin
- destination
- requested date/time
- price
- request date
- status

After acceptance, the requester sees `CONFIRMED`.

## Request persistence
Every request must create a durable DB record before success is reported.

Conceptually:
```text
transport_request
├── requester_id
├── transporter_id
├── transport_service_id
├── origin
├── destination
├── requested_date/time
├── price
├── status
├── created_at
└── updated_at
```

Reuse existing equivalent schema if present. Do not create duplicate request systems.

## Critical bug
Current:
```text
Customer sends request
        ↓
Request appears successful
        ↓
Transporter receives nothing
```

Fix the complete server/database flow. The selected transport service must resolve to the correct provider/transporter and the request must be associated with that recipient.

## Notifications
After successful persistence:
```text
Request created
   ├── Receiving Requests → transporter
   └── Sending Requests → requester
```

Use the existing notification mechanism where available. Dashboard records remain the source of truth.

On acceptance:
```text
Transporter accepts
      ↓
ACCEPTED / CONFIRMED
      ├── Transporter updated
      └── Requester updated + notified
```

## Authorization / RLS
Verify server-side:
- requester can create requests
- transporter can read only assigned requests
- requester can read only their requests
- transporter alone can accept/reject assigned requests
- requester cannot manipulate transporter/status/price
- IDOR is prevented

Follow existing Supabase RLS architecture.

## Payment
Do not implement payment now.

```text
PENDING → ACCEPTED / CONFIRMED
```

Future payment/second confirmation is a future extension. Any placeholder must be clearly `Coming Soon` and non-functional.

## UX
Reuse the existing Service Requests interaction and visual logic wherever possible, including cards, statuses, filters, notifications, confirmation dialogs and responsive behavior.

Empty states:
- Receiving: `No transport requests received yet.`
- Sending: `You have not sent any transport requests yet.`

## Acceptance criteria
1. Customer selects a published transport service.
2. Customer submits a request.
3. DB confirms persistence.
4. Request appears in Sending Requests.
5. Same request appears in the selected transporter's Receiving Requests.
6. Transporter is notified when the existing notification system supports it.
7. Transporter accepts.
8. Request immediately becomes ACCEPTED / CONFIRMED.
9. Customer sees confirmed status and receives notification.
10. Transporter sees confirmed status.
11. Unauthorized users cannot read or mutate the request.
12. Refresh/relogin preserves state.

## Regression
Run existing typecheck, lint, tests and build. Test desktop and mobile dashboard navigation.
