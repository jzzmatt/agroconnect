import { createWaapiGateway } from "./gateway";
import { createSupabaseWhatsappStore } from "./repository";
import { createWhatsappService, type WhatsappService } from "./service";
import { WhatsappServiceError } from "./types";

export function webhookUrlForToken(token: string): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!origin.startsWith("http")) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
  return `${origin}/api/webhooks/waapi/${token}`;
}

export function createWhatsappRuntime(): WhatsappService {
  return createWhatsappService({
    store: createSupabaseWhatsappStore(),
    gateway: createWaapiGateway(),
    webhookUrlFor: webhookUrlForToken,
  });
}
