# Clerk Authentication & Supabase Integration

## 1. Architectural Model

In **AGROCONNECT**, identity and application data are strictly separated:

- **Clerk** owns user identity, credentials, Google/Email OAuth, passwords, multi-factor authentication, and active sessions.
- **Supabase** owns domain data (`profiles`, `user_roles`, `locations`, marketplace items) and enforces data access via **Row Level Security (RLS)**.

```
┌──────────────┐                 ┌────────────────────┐
│  Clerk Auth  │ ── JWT Session ─▶│ Supabase Postgres  │
│  (Identity)  │    (Bearer)     │ (RLS: auth.jwt())  │
└──────────────┘                 └────────────────────┘
       │                                   │
       ▼                                   ▼
 clerk_user_id ───────────────────▶ public.profiles.clerk_user_id
```

> **Security Rule**: Supabase **never** stores passwords or authentication sessions.

---

## 2. Modern Native Supabase 3rd-Party Integration

We use Clerk's native integration with Supabase third-party auth (no deprecated JWT template required). The client and server factories pass the Bearer session token directly to Supabase headers:

### Client-side (`src/lib/supabase/client.ts`)

```typescript
export function createAuthenticatedSupabaseClient(clerkToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  });
}
```

### Server-side (`src/lib/supabase/server.ts`)

```typescript
export async function createServerSupabaseClient() {
  const { getToken } = await auth();
  const token = await getToken();

  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    token
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      : {}
  );
}
```

---

## 3. Row Level Security Policies

Supabase RLS policies extract the authenticated Clerk user identifier via `auth.jwt() ->> 'sub'`:

```sql
-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (clerk_user_id = (auth.jwt()->>'sub'));

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (clerk_user_id = (auth.jwt()->>'sub'))
WITH CHECK (clerk_user_id = (auth.jwt()->>'sub'));
```

---

## 4. Route Protection Middleware

The middleware (`src/middleware.ts`) protects authenticated routes while keeping marketing and product showcase pages public:

| Route Type | Routes |
|---|---|
| **Public** | `/`, `/agriexpert`, `/agriacademy`, `/agrishopping`, `/agrilocalizacao`, `/pricing`, `/about`, `/sign-in`, `/sign-up` |
| **Protected** | `/dashboard`, `/profile`, `/profile/edit`, `/settings` |
