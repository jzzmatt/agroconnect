import { sendWaapiText } from "@/lib/integrations/waapi/messages";
import { createSupabaseCoursePublishStore } from "@/lib/whatsapp/course-publish-repository";
import { createCoursePublishService } from "@/lib/whatsapp/course-publish-service";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

export function createCoursePublishRuntime() {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!origin.startsWith("http")) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
  return createCoursePublishService({
    store: createSupabaseCoursePublishStore(),
    origin,
    sender: {
      sendText: (instanceId, chatId, message) => sendWaapiText(instanceId, chatId, message),
    },
  });
}
