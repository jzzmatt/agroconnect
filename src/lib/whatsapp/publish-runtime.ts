import { sendWaapiMedia, sendWaapiText } from "@/lib/integrations/waapi/messages";
import { createSupabasePublishStore } from "./publish-repository";
import { createProductPublishService } from "./publish-service";
import { WhatsappServiceError } from "./types";

export function createProductPublishRuntime() {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!origin.startsWith("http")) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
  return createProductPublishService({
    store: createSupabasePublishStore(),
    origin,
    sender: {
      sendText: (instanceId, chatId, message) => sendWaapiText(instanceId, chatId, message),
      sendMedia: (instanceId, chatId, mediaUrl, caption) => sendWaapiMedia(instanceId, chatId, mediaUrl, undefined, caption),
    },
  });
}
