# Local Development Guide

## 1. Prerequisites

- **Node.js**: `v20+` or `v22+`
- **npm** or **pnpm**
- **Git**

---

## 2. Getting Started

### 2.1 Clone and Install Dependencies

```bash
git clone https://github.com/jzzmatt/agroconnect.git
cd agroconnect
npm install
```

### 2.2 Configure Environment Variables

Copy the sample environment file:

```bash
cp .env.example .env.local
```

Fill in the required keys in `.env.local`:

```ini
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk Authentication (Get from dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase PostgreSQL & API (Get from supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Map Provider (Phase 1 default: osm)
NEXT_PUBLIC_MAP_PROVIDER=osm
NEXT_PUBLIC_MAP_TOKEN=

# Cloudflare (Future Phase Video/Assets)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_STREAM_TOKEN=
CLOUDFLARE_R2_BUCKET=
```

---

## 3. Database Setup (Supabase)

1. Create a project in [Supabase](https://supabase.com).
2. Execute the Phase 1 migration script:
   - Run `supabase/migrations/20260821000001_phase1_foundation.sql` in the Supabase SQL Editor.
3. Seed Angola reference geographic data:
   - Run `supabase/seed/angola/provinces.sql`
   - Run `supabase/seed/angola/municipalities.sql`

---

## 4. Development Commands

| Command | Action |
|---|---|
| `npm run dev` | Starts the Next.js local development server at `http://localhost:3000` |
| `npm run build` | Compiles the production application bundle with Turbopack |
| `npm run start` | Runs the compiled production server |
| `npm run typecheck` | Validates TypeScript with strict type checking (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint analysis across the codebase |
| `npm run test` | Executes the Vitest automated test suite |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
