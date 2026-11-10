import "server-only";

import { generateServiceThumbnailImage } from "@/lib/services/service-thumbnail-generation";
import { createSupabaseServiceThumbnailStore } from "@/lib/services/service-thumbnail-repository";
import { createServiceThumbnailService } from "@/lib/services/service-thumbnail-service";

export function createServiceThumbnailRuntime() {
  return createServiceThumbnailService({
    store: createSupabaseServiceThumbnailStore(),
    generate: generateServiceThumbnailImage,
  });
}
