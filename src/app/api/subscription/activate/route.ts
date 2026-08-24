import { NextResponse } from "next/server";
import {
  activateUserSubscriptionPlan,
  type PlanActivationCode,
} from "@/lib/subscription/activate-plan";
import { parseStoredPlan } from "@/lib/services/pricing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthError(message?: string | null) {
  return /autorizado|unauthor|sign in|iniciar sessão/i.test(message || "");
}

/**
 * Distinct statuses per failure so a caller can tell "you are signed out" from
 * "this environment has it switched off" from "the database rejected the write".
 */
const STATUS_BY_CODE: Record<PlanActivationCode, number> = {
  ACTIVATED: 200,
  AUTH_REQUIRED: 401,
  ACTIVATION_DISABLED: 403,
  SUPABASE_NOT_CONFIGURED: 503,
  PLAN_NOT_PERSISTED: 502,
  INVALID_PLAN: 400,
  UNEXPECTED_ERROR: 500,
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const plan = parseStoredPlan(body?.plan);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plano de subscrição inválido.",
          plan: null,
          code: "INVALID_PLAN",
        },
        { status: 400 }
      );
    }
    const result = await activateUserSubscriptionPlan(plan);
    const status = STATUS_BY_CODE[result.code] ?? (result.success ? 200 : 400);
    return NextResponse.json(result, { status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (isAuthError(message)) {
      return NextResponse.json(
        { success: false, error: message, plan: null, code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    console.warn("[POST /api/subscription/activate]", message);
    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível atualizar o seu plano.",
        plan: null,
        code: "UNEXPECTED_ERROR",
        detail: message,
      },
      { status: 500 }
    );
  }
}
