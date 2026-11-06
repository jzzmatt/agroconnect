# WhatsApp connection (WaAPI)

Phase 1 connects one WhatsApp account to one Agroconnect profile and stores the groups that profile chooses. It does not publish products, courses or services, and it does not send messages.

## Prerequisites

- A WaAPI account and a server-side API token.
- Capacity for one instance per connected Agroconnect user. Creating an instance can be billed. A declined charge returns HTTP 402 and no instance is created. HTTP 409 means another instance for the same WaAPI account is still being prepared.
- `NEXT_PUBLIC_APP_URL` must be the public origin of this deployment. WaAPI delivers webhooks to `{NEXT_PUBLIC_APP_URL}/api/webhooks/waapi/{token}`. The token is random, stored only in `whatsapp_connections.webhook_token`, and is not returned to the browser.
- Apply `supabase/migrations/20261106104021_whatsapp_connections.sql`.
- `SUPABASE_SERVICE_ROLE_KEY` is required. The browser role cannot read the instance id or the webhook token.

## Environment

```ini
WAAPI_API_TOKEN=
WAAPI_API_BASE_URL=https://waapi.app/api/v1
NEXT_PUBLIC_APP_URL=https://your-public-host
```

`WAAPI_API_TOKEN` must not use the `NEXT_PUBLIC_` prefix. Do not commit a real token.

Localhost cannot receive WaAPI webhooks. The dashboard still polls `GET /instances/{id}/client/status` and `GET /instances/{id}/client/me`. A number is stored only after that status is `ready` or `authenticated` and `client/me` returns a phone number.

## Operations used

| Purpose | WaAPI call |
|---|---|
| Create the user's instance | `POST /instances` |
| Point the instance at this user's webhook | `PUT /instances/{id}` |
| QR code | `GET /instances/{id}/client/qr` |
| Status | `GET /instances/{id}/client/status` |
| Connected number | `GET /instances/{id}/client/me` |
| Groups | `POST /instances/{id}/client/action/get-chats` |
| Disconnect | `POST /instances/{id}/client/action/logout` |
| Remove an instance that could not be saved | `DELETE /instances/{id}` |

Webhook events registered for the instance are `qr`, `loading_screen`, `authenticated`, `auth_failure`, `ready` and `disconnected`. The handler checks the URL token against the stored token and checks `instanceId` against that row. Other events are ignored. Message bodies are not stored.

Group chats are the ones whose id ends in `@g.us`. The documented chat object has no image field, so `group_image_url` stays empty unless the payload includes an `https` `profilePicUrl`.
