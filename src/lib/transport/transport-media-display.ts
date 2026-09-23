import "server-only";

import { TRANSPORT_MEDIA_BUCKET } from "@/lib/media/supabase-buckets";
import { resolveSignedDisplayUrl } from "@/lib/media/supabase-storage-core";

export async function resolveTransportImageUrl(service: {
  vehicle_media_url?: string | null;
  vehicle_image_storage_path?: string | null;
}): Promise<string | null> {
  return resolveSignedDisplayUrl(
    TRANSPORT_MEDIA_BUCKET,
    service.vehicle_image_storage_path,
    service.vehicle_media_url
  );
}

export async function resolveTransportVideoUrl(service: {
  vehicle_video_url?: string | null;
  vehicle_video_storage_path?: string | null;
}): Promise<string | null> {
  return resolveSignedDisplayUrl(
    TRANSPORT_MEDIA_BUCKET,
    service.vehicle_video_storage_path,
    service.vehicle_video_url
  );
}
