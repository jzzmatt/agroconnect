import { sendWaapiMedia, sendWaapiText } from "@/lib/integrations/waapi/messages";
import { createSupabaseServicePublishStore } from "@/lib/whatsapp/service-publish-repository";
import { createServicePublishService } from "@/lib/whatsapp/service-publish-service";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

export function createServicePublishRuntime() {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!origin.startsWith("http")) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
  return createServicePublishService({
    store: createSupabaseServicePublishStore(),
    origin,
    sender: {
      sendText: (instanceId, chatId, message) => sendWaapiText(instanceId, chatId, message),
      sendMedia: (instanceId, chatId, mediaUrl, caption) => sendWaapiMedia(instanceId, chatId, mediaUrl, undefined, caption),
    },
  });
}
