#!/usr/bin/env bash
# Cloud Agent install step for AGROCONNECT.
# Idempotent: safe to run repeatedly and against cached/snapshotted state.
set -euo pipefail

# Always operate from the repository root (this script lives in .cursor/).
cd "$(dirname "$0")/.."

echo "==> Installing dependencies (npm ci)"
npm ci

# Next.js reads .env.local for local development. Real credentials supplied via
# Cloud Agent Secrets are injected as environment variables and always take
# precedence over .env files, so we only seed non-secret dev defaults here and
# never write placeholder Clerk/Supabase values that would mask real secrets.
if [ ! -f .env.local ]; then
  echo "==> Seeding .env.local with development defaults"
  cat > .env.local <<'EOF'
# Local development defaults for AGROCONNECT (managed by .cursor/install.sh).
# Real credentials should be provided via Cloud Agent Secrets, which override
# these values automatically.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Lets a signed-in user self-activate paid plans while building/demoing.
ALLOW_SELF_SERVICE_PLAN_ACTIVATION=true

# Map provider (public, non-secret default).
NEXT_PUBLIC_MAP_PROVIDER=mapquest
EOF
fi

# Clerk middleware runs on every route and returns HTTP 500 without a valid
# publishable key, so the app is unusable until one is configured. Prefer a real
# key from Secrets / .env.local; otherwise provision Clerk keyless development
# keys so a fresh Cloud Agent boots a fully working app with zero manual setup.
resolve_clerk_pk() {
  if [ -n "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
    printf '%s' "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    return
  fi
  if [ -f .env.local ]; then
    grep -E '^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=' .env.local | tail -n1 | cut -d= -f2- || true
  fi
}

clerk_pk="$(resolve_clerk_pk)"
case "$clerk_pk" in
  pk_test_*placeholder*|pk_live_*placeholder*|""|pk_test_|pk_live_)
    valid_key="false" ;;
  pk_test_*|pk_live_*)
    valid_key="true" ;;
  *)
    valid_key="false" ;;
esac

if [ "$valid_key" = "true" ]; then
  echo "==> Clerk publishable key already configured; skipping keyless provisioning."
else
  echo "==> No valid Clerk key found; provisioning Clerk keyless development keys."
  if npx --yes clerk@latest init --framework next --pm npm --keyless --no-skills -y; then
    echo "==> Clerk keyless development keys provisioned into .env.local."
  else
    echo "WARN: Clerk keyless provisioning failed (network?). Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" >&2
    echo "WARN: and CLERK_SECRET_KEY via Cloud Agent Secrets to run the app." >&2
  fi
fi

echo "==> Install complete."
