import { NextResponse } from "next/server";
import { activateUserSubscriptionPlan } from "@/lib/subscription/activate-plan";
import { normalizePlanSlug } from "@/lib/services/pricing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthError(message?: string | null) {
  return /autorizado|unauthor|sign in|iniciar sessão/i.test(message || "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const plan = normalizePlanSlug(body?.plan);
    const result = await activateUserSubscriptionPlan(plan);
    const status = result.success ? 200 : isAuthError(result.error) ? 401 : 400;
    return NextResponse.json(result, { status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (isAuthError(message)) {
      return NextResponse.json(
        { success: false, error: message, plan: "basic" },
        { status: 401 }
      );
    }
    console.warn("[POST /api/subscription/activate]", message);
    return NextResponse.json(
      { success: false, error: "Não foi possível atualizar o seu plano.", plan: "basic" },
      { status: 500 }
    );
  }
}
