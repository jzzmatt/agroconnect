# AGROCONNECT — Authentication & User Identity Integration (Phase 4)

## 1. Overview & Architecture

In **AGROCONNECT**, identity and application data are strictly separated according to modern cloud patterns:

- **Clerk** owns identity, user credentials, Google OAuth, Email login, password management, active sessions, and multi-factor authentication.
- **Supabase PostgreSQL** owns application data (`profiles`, `user_roles`, `services`, `products`, `locations`, `reviews`, `requests`) and enforces authorization via **PostgreSQL Row Level Security (RLS)**.

```
┌──────────────────────────┐
│      User Client         │
└────────────┬─────────────┘
             │ 1. Authenticates with Google / Email
             ▼
┌──────────────────────────┐
│       Clerk Auth         │ ─── 2. Verified Webhook (Svix) ───▶ /api/webhooks/clerk
│   (Identity Provider)    │                                     (Idempotent Profile Sync)
└────────────┬─────────────┘
             │ 3. Session Bearer JWT (contains sub = clerk_user_id)
             ▼
┌──────────────────────────┐
│  Next.js Server Actions  │ ─── 4. Forwards Token in Authorization Header
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│   Supabase PostgreSQL    │
│   (Row Level Security)   │
│                          │
│   auth.jwt() ->> 'sub'   │ ─── 5. Evaluates `clerk_user_id` ownership
│            ==            │
│  profiles.clerk_user_id  │
└──────────────────────────┘
```

> **Security Rule**: Supabase **never** stores user passwords or handles authentication sessions. Passwords are never stored in the database.

---

## 2. User Identity Mapping Model

- **Database Primary Key**: `public.profiles.id` is an internal RFC 4122 `UUID`.
- **Clerk External Identifier**: `public.profiles.clerk_user_id` is a unique `TEXT` reference mapped directly to Clerk's `user.id` (e.g. `user_2P9x87kLmnPQ`).
- **Initial Profile Defaults**:
  - `preferred_language`: `'pt'` (Portuguese)
  - `account_type`: `'customer'` (Standard customer by default; elevated capabilities like `provider` or `admin` are explicitly granted).
  - `status`: `'active'`
  - `theme_preference`: `'light'`

---

## 3. Webhook Synchronization Architecture (`/api/webhooks/clerk`)

The application implements a secure webhook endpoint at `src/app/api/webhooks/clerk/route.ts` using the official `svix` cryptographic signature verification package:

1. **`user.created`**:
   - Extracts Clerk ID, primary verified email, phone, full name, and avatar.
   - Idempotently upserts a `public.profiles` record (`ON CONFLICT (clerk_user_id) DO UPDATE`).
   - Assigns default `'student'` role in `public.user_roles`.
   - Records an entry in `public.audit_logs`.
2. **`user.updated`**:
   - Updates `email`, `phone`, `first_name`, `last_name`, `display_name`, and `avatar_url`.
   - Preserves application-specific business fields (such as `account_type`, `status`, verification status).
3. **`user.deleted`**:
   - Performs an application-level soft deactivation (`status = 'inactive'`, `is_active = false`).
   - Preserves marketplace integrity (historical reviews, past orders, and audit logs) while revoking platform access.

---

## 4. Server-Side Authentication Helpers (`src/lib/clerk/auth.ts`)

| Helper Function | Description |
|---|---|
| `getCurrentUserId()` | Returns the authenticated Clerk user ID from the active session context. |
| `requireAuth()` | Throws a friendly Portuguese error if the caller is unauthenticated. |
| `requireRole(allowedRoles)` | Verifies that the authenticated user possesses at least one required capability role (e.g., `veterinarian`, `agronomist`, `seller`) or has admin status. |
| `getCurrentProfile()` / `getCurrentUserProfile()` | Retrieves the active profile with roles, gracefully bootstrapping a profile if the Clerk user has not yet received a webhook sync. |

---

## 5. Client Architecture & Service-Role Isolation

Three distinct Supabase clients are provided:

1. **Browser Client (`createPublicSupabaseClient()`)**:
   - Uses public Supabase publishable key for public marketplace discovery and map queries.
2. **Authenticated Client (`createAuthenticatedSupabaseClient(token)` / `createServerSupabaseClient()`)**:
   - Forwards the active Clerk session JWT in the `Authorization: Bearer <token>` header so PostgreSQL RLS policies evaluate `auth.jwt()->>'sub'`.
3. **Admin / Privileged Client (`createAdminServerSupabaseClient()`)**:
   - Server-only client using `SUPABASE_SERVICE_ROLE_KEY`.
   - Used exclusively for verified webhook synchronization and privileged administrative jobs.
   - **Never exposed to the client-side or browser**.

---

## 6. Route Protection Matrix (`src/middleware.ts`)

| Route Category | Paths | Access Rule |
|---|---|---|
| **Public** | `/`, `/agriexpert`, `/agriacademy`, `/agrishopping`, `/agrilocalizacao`, `/pricing`, `/about`, `/sign-in`, `/sign-up`, `/api/webhooks/clerk` | Accessible without active session |
| **Protected** | `/dashboard`, `/profile`, `/profile/edit`, `/settings` | Redirects unauthenticated users to `/sign-in` |

---

## 7. Automated Testing & Verification

Automated unit tests in `src/test/auth.test.ts` validate:
- Unauthenticated public client queries.
- Authenticated client token forwarding.
- Svix signature verification rejection on invalid signatures.
- Decoupled identity model mapping (`UUID` vs `clerk_user_id`).
- Complete isolation of the server-side service role key.
