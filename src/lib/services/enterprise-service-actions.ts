"use server";

import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requestCustomPaymentGatewayAction(message?: string): Promise<{
  success: boolean;
  requestId?: string;
  error?: string;
}> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Não autorizado." };

    const entitlements = getUserEntitlements({ subscriptionPlan: profile.subscription_plan });
    if (!entitlements.can_request_custom_payment_gateway) {
      return {
        success: false,
        error: "A configuração personalizada de gateway de pagamento está disponível no plano Empresarial.",
      };
    }

    const supabase = await createServerSupabaseClient();
    const { data } = await (supabase.from("enterprise_service_requests") as any)
      .insert({
        profile_id: profile.id,
        service_code: "custom_payment_gateway_setup",
        title: "Configuração personalizada de gateway de pagamento",
        message: message || null,
        status: "requested",
      })
      .select("id")
      .single();

    return {
      success: true,
      requestId: data?.id || `esr-${Math.random().toString(36).slice(2, 8)}`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Não foi possível enviar o pedido." };
  }
}
