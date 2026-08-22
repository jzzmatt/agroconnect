import { requireAuth } from "@/lib/clerk/auth";
import {
  createAdminServerSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { getUserEntitlements, normalizePlanSlug } from "@/lib/services/pricing-service";
import { setAuthoritativeSubscription } from "@/lib/subscription/store";
import { DEFAULT_MARKET_COUNTRY } from "@/config/markets";
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
  return setAuthoritativeSubscription(clerkUserId, {
    plan,
    marketCountryCode: DEFAULT_MARKET_COUNTRY,
    preferredLanguage: "pt",
  });
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
      normalizePlanSlug(updated.data.subscription_plan) === plan
    ) {
      return { ok: true };
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
      normalizePlanSlug(last.data.subscription_plan) === plan
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

export async function activateUserSubscriptionPlan(plan: string): Promise<{
  success: boolean;
  plan: SubscriptionPlan;
  entitlements: UserEntitlements;
  error?: string;
}> {
  const normalized = normalizePlanSlug(plan);
  const fail = () => ({
    success: false as const,
    plan: "basic" as SubscriptionPlan,
    entitlements: getUserEntitlements({ subscriptionPlan: "basic" }),
    error: PLAN_ERROR,
  });

  try {
    const clerkUserId = await requireAuth();
    // Authenticated cache first so the dashboard can read the new plan even if
    // durable persist is briefly behind or unreachable.
    cachePlan(clerkUserId, normalized);

    const persist = await persistSubscriptionPlan(clerkUserId, normalized);
    if (!persist.ok && !persist.unavailable) {
      console.warn("[activatePlan] durable persist failed, serving trusted server cache:", persist.error);
    }

    return {
      success: true,
      plan: normalized,
      entitlements: getUserEntitlements({ subscriptionPlan: normalized }),
    };
  } catch (err: unknown) {
    const message = asErrorMessage(err);
    if (/autorizado|iniciar sessão|unauthor|sign in/i.test(message)) {
      return {
        success: false,
        plan: "basic",
        entitlements: getUserEntitlements({ subscriptionPlan: "basic" }),
        error: message,
      };
    }
    console.warn("[activatePlan] unexpected error:", message);
    return fail();
  }
}
