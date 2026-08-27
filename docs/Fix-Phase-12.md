# Fix-Phase-12 — Transport Request Production Hardening

## Objective
Harden Transport Service Requests and confirmed bookings for security, reliability and regression safety.

## Security
Review:
```text
Customer
  ↓
Create Request
  ↓
Receiving Requests
  ↓
Accept / Reject
  ↓
Confirmed Booking
  ↓
Sending Requests
```

Verify authorization on every read and mutation.

## RLS / ownership
Prevent:
- cross-customer request access
- cross-transporter request access
- customer accept/reject
- unrelated-user mutation
- client manipulation of requester_id/transporter_id
- client manipulation of price/status
- IDOR

Use authenticated server identity, not trusted client user IDs.

## Recipient correctness
Resolve:
```text
transport_service
      ↓
provider/transporter identity
      ↓
transport_request.transporter_id
```

The request must appear in that user's Receiving Requests.

Notifications must not be the sole recipient mechanism.

## Notification reliability
Only trigger notification after successful persistence:
```text
DB success
   ↓
Dashboard request
   ↓
Notification
```

If notification fails, the request remains visible.

Acceptance:
```text
Transporter accepts
      ↓
DB = ACCEPTED / CONFIRMED
      ↓
Requester notification
```

## Status hardening
Allowed:
```text
PENDING → ACCEPTED / CONFIRMED
PENDING → REJECTED
ACCEPTED / CONFIRMED → COMPLETED
ACCEPTED / CONFIRMED → CANCELLED
```

Reject invalid transitions server-side.

Acceptance is immediate confirmation. No payment dependency.

## Concurrency
Prevent double acceptance/duplicate booking using an atomic/database-safe transition where appropriate.

Example:
```text
UPDATE request
SET status = ACCEPTED
WHERE id = ?
  AND status = PENDING
  AND transporter_id = current_user
```

Follow existing project architecture.

## Dashboard consistency
Receiving and Sending Requests query persisted state. Do not use localStorage as source of truth.

After refresh, relogin or another device, the request and status must remain correct.

## UI hardening
Reuse Service Requests patterns for:
- status badges
- filters
- loading states
- empty states
- errors
- confirmations
- responsive behavior

Prevent duplicate submissions.

## Privacy
Expose only information necessary for the requester/transporter to fulfil and manage the booking.

## Future payment boundary
Do not implement payment.

Future:
```text
ACCEPTED / CONFIRMED
        ↓
[Future Payment Confirmation]
        ↓
Paid / Payment Failed
```

Current behavior remains confirmed immediately after transporter acceptance.

## Regression matrix

### Customer
- send request
- see Sending Requests
- refresh
- see pending
- see confirmed
- see rejection
- receive acceptance notification

### Transporter
- receive request
- see Receiving Requests
- refresh
- accept
- reject
- see confirmed booking
- unauthorized access blocked

### Cross-user
- Customer A cannot see Customer B requests
- Transporter A cannot see Transporter B requests
- Transporter A cannot accept Transporter B request
- Customer cannot modify transporter/status

### Reliability
- repeated submit
- repeated accept
- two tabs
- notification failure
- reload during mutation
- sign-out/sign-in

## Final validation
Run:
```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

No existing Service Request, AgriService, Commerce or authorization functionality should regress.
