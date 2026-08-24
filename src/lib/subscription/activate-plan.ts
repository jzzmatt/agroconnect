import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import {
  createAdminServerSupabaseClient,
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
  isSupabaseConfigured,
  missingSupabaseEnvVars,
} from "@/lib/supabase/server";
import { getUserEntitlements, parseStoredPlan } from "@/lib/services/pricing-service";
import { AuthorizationError, requirePlanActivationAllowed } from "@/lib/authorization";
import { setAuthoritativeSubscription } from "@/lib/subscription/store";
import type { SubscriptionPlan } from "@/types/database";
import type { UserEntitlements } from "@/types/domain";

const PLAN_ERROR = "Não foi possível atualizar o seu plano.";
const PERSIST_BUDGET_MS = 8_000;

type RpcResult = { data?: unknown; error?: { message?: string } | null };
type RowResult = {
  data?: { subscription_plan?: string | null } | null;
  error?: { message?: string } | null;
};

function isPlaceholderSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

function isUnavailableError(message?: string | null): boolean {
  if (isPlaceholderSupabase()) return true;
  return /fetch|network|placeholder|ENOTFOUND|ECONNREFUSED|timeout|abort|message port/i.test(
    message || ""
  );
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return String(error);
}

async function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promiseLike),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function remainingMs(deadline: number): number {
  return Math.max(400, deadline - Date.now());
}

function cachePlan(clerkUserId: string, plan: SubscriptionPlan) {
  // Only the plan. Passing a market or language here would overwrite whatever
  // the user had chosen, because the cache treats a supplied value as intent.
  // This cache is a read-through hint, never the authority for UI or APIs.
  return setAuthoritativeSubscription(clerkUserId, { plan });
}

async function readPersistedPlan(clerkUserId: string): Promise<SubscriptionPlan | null> {
  try {
    const client = tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
    const result = (await withTimeout(
      (client.from("profiles") as any)
        .select("subscription_plan")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle(),
      4_000
    )) as RowResult;
    if (result.error || !result.data) return null;
    return parseStoredPlan(result.data.subscription_plan);
  } catch {
    return null;
  }
}

function persistPayload(plan: SubscriptionPlan) {
  const now = new Date().toISOString();
  return {
    subscription_plan: plan,
    subscription_updated_at: now,
    updated_at: now,
  };
}

async function persistSubscriptionPlan(
  clerkUserId: string,
  plan: SubscriptionPlan
): Promise<{ ok: boolean; unavailable?: boolean; error?: string }> {
  if (isPlaceholderSupabase()) {
    return { ok: false, unavailable: true };
  }

  const deadline = Date.now() + PERSIST_BUDGET_MS;
  const payload = persistPayload(plan);

  try {
    const admin = createAdminServerSupabaseClient();

    const updated = (await withTimeout(
      (admin.from("profiles") as any)
        .update(payload)
        .eq("clerk_user_id", clerkUserId)
        .select("subscription_plan")
        .maybeSingle(),
      remainingMs(deadline)
    )) as RowResult;
    if (
      !updated.error &&
      updated.data &&
      parseStoredPlan(updated.data.subscription_plan) === plan
    ) {
      return { ok: true };
    }

    // An UPDATE matches zero rows when the Clerk user has no profile yet
    // (webhook not delivered in local development). Create it with the plan.
    if (!updated.error && !updated.data) {
      const upserted = (await withTimeout(
        (admin.from("profiles") as any)
          .upsert(
            {
              clerk_user_id: clerkUserId,
              ...payload,
              status: "active",
              account_type: "customer",
              preferred_language: "pt",
              is_active: true,
            },
            { onConflict: "clerk_user_id" }
          )
          .select("subscription_plan")
          .maybeSingle(),
        remainingMs(deadline)
      )) as RowResult;
      if (
        !upserted.error &&
        upserted.data &&
        parseStoredPlan(upserted.data.subscription_plan) === plan
      ) {
        return { ok: true };
      }
      if (upserted.error) {
        console.warn("[activatePlan] admin upsert:", upserted.error.message);
      }
    }

    const adminRpc = (await withTimeout(
      (admin as any).rpc("activate_user_subscription_plan", {
        p_clerk_user_id: clerkUserId,
        p_plan: plan,
      }),
      remainingMs(deadline)
    )) as RpcResult;
    if (!adminRpc.error) return { ok: true };
    console.warn("[activatePlan] admin rpc:", adminRpc.error?.message);
  } catch (adminError) {
    const message = asErrorMessage(adminError);
    if (!message.includes("SUPABASE_SERVICE_ROLE_KEY") && message !== "timeout") {
      console.warn("[activatePlan] admin persist:", message);
    }
  }

  if (Date.now() >= deadline) {
    return { ok: false, unavailable: true, error: "timeout" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const rpcWithUser = (await withTimeout(
      (supabase as any).rpc("activate_user_subscription_plan", {
        p_clerk_user_id: clerkUserId,
        p_plan: plan,
      }),
      remainingMs(deadline)
    )) as RpcResult;
    if (!rpcWithUser.error) return { ok: true };

    const rpcPlanOnly = (await withTimeout(
      (supabase as any).rpc("activate_user_subscription_plan", { p_plan: plan }),
      remainingMs(deadline)
    )) as RpcResult;
    if (!rpcPlanOnly.error) return { ok: true };

    const last = (await withTimeout(
      (supabase.from("profiles") as any)
        .update(payload)
        .eq("clerk_user_id", clerkUserId)
        .select("subscription_plan")
        .maybeSingle(),
      remainingMs(deadline)
    )) as RowResult;

    if (
      !last.error &&
      last.data &&
      parseStoredPlan(last.data.subscription_plan) === plan
    ) {
      return { ok: true };
    }

    const message =
      last.error?.message ||
      rpcWithUser.error?.message ||
      rpcPlanOnly.error?.message ||
      "persist_failed";
    return { ok: false, unavailable: isUnavailableError(message), error: message };
  } catch (error) {
    const message = asErrorMessage(error) || "persist_failed";
    return { ok: false, unavailable: isUnavailableError(message), error: message };
  }
}

export type PlanActivationCode =
  | "ACTIVATED"
  | "AUTH_REQUIRED"
  | "ACTIVATION_DISABLED"
  | "SUPABASE_NOT_CONFIGURED"
  | "PLAN_NOT_PERSISTED"
  | "INVALID_PLAN"
  | "UNEXPECTED_ERROR";

export interface PlanActivationResult {
  success: boolean;
  plan: SubscriptionPlan | null;
  entitlements: UserEntitlements;
  persisted?: boolean;
  code: PlanActivationCode;
  error?: string;
  /** Safe diagnostic describing why activation failed. Never contains secrets. */
  detail?: string;
}

export async function activateUserSubscriptionPlan(
  plan: string
): Promise<PlanActivationResult> {
  const normalized = parseStoredPlan(plan);
  const fail = (
    code: PlanActivationCode,
    detail?: string,
    error: string = PLAN_ERROR
  ): PlanActivationResult => ({
    success: false,
    plan: null,
    persisted: false,
    entitlements: getUserEntitlements({ subscriptionPlan: null }),
    code,
    error,
    detail,
  });

  if (!normalized) {
    return fail("INVALID_PLAN", "invalid plan", "Plano de subscrição inválido.");
  }

  try {
    const clerkUserId = await requireAuth();

    // Authentication is not authorization: without this guard any signed-in user
    // could POST their own tier and unlock every paid entitlement.
    try {
      requirePlanActivationAllowed(normalized);
    } catch (denied) {
      if (denied instanceof AuthorizationError) {
        console.warn("[activatePlan] denied:", denied.code, normalized);
        return fail(
          "ACTIVATION_DISABLED",
          "ALLOW_SELF_SERVICE_PLAN_ACTIVATION is set to false in this environment."
        );
      }
      throw denied;
    }

    // Without database credentials the plan can only live in this process, so a
    // later request reads "basic" again.
    if (!isSupabaseConfigured()) {
      const missing = missingSupabaseEnvVars().join(", ");
      console.error("[activatePlan] database not configured; missing:", missing);
      return fail(
        "SUPABASE_NOT_CONFIGURED",
        `Missing: ${missing}`,
        `A base de dados não está configurada neste ambiente (em falta: ${missing}).`
      );
    }

    // The plan lives on the profile row. Bootstrap it first, otherwise the
    // update below matches zero rows and the plan only exists in memory —
    // which a later request on another server instance cannot read.
    await getCurrentUserProfile().catch(() => null);

    const persist = await persistSubscriptionPlan(clerkUserId, normalized);

    if (!persist.ok) {
      // Reporting success for a write that did not happen is what made the plan
      // appear to change and then revert: the process cache served the new value
      // until the next restart, while the database still held the old one.
      console.error(
        "[activatePlan] durable persist failed:",
        persist.error || "unknown",
        "plan:",
        normalized
      );
      return fail("PLAN_NOT_PERSISTED", persist.error || "persist_failed");
    }

    // Re-read the row after the write. Application state may only update from
    // the database result, not from the requested plan slug.
    const confirmed = await readPersistedPlan(clerkUserId);
    if (!confirmed) {
      return fail("PLAN_NOT_PERSISTED", "re-read failed after persist");
    }

    cachePlan(clerkUserId, confirmed);

    return {
      success: true,
      plan: confirmed,
      persisted: true,
      code: "ACTIVATED",
      entitlements: getUserEntitlements({ subscriptionPlan: confirmed }),
    };
  } catch (err: unknown) {
    const message = asErrorMessage(err);
    if (/autorizado|iniciar sessão|unauthor|sign in/i.test(message)) {
      return fail("AUTH_REQUIRED", undefined, message);
    }
    console.warn("[activatePlan] unexpected error:", message);
    return fail("UNEXPECTED_ERROR", message);
  }
}
