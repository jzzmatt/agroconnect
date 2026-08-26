import { getUserEntitlements } from "@/lib/services/pricing-service";
import { planLibraryReconcile } from "@/lib/academy/video-library-sync";
import { resolvePlaybackEmbedUrl } from "@/lib/academy/video-playback";
import {
  createBunnyVideo,
  deleteBunnyVideo,
  fetchBunnyVideoStatus,
  getBunnyConfig,
  getBunnyEmbedUrl,
  isBunnyConfigured,
  listBunnyLibraryVideos,
} from "@/lib/video/bunny";
import { getMediaSupabaseClient } from "@/lib/media/db";
import type { SubscriptionPlan } from "@/types/database";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

export type AcademyVideoRecord = AcademyVideoDescriptor;

const TABLE = "academy_videos";

/**
 * Supabase-backed (`academy_videos`). No module-level array/Map — every
 * read/write round-trips the database. Training video stays on Bunny Stream
 * exclusively, per Phase 4's provider split.
 */
export class AcademyVideoService {
  public static async getUsageBytes(ownerId: string): Promise<number> {
    const supabase = getMediaSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("file_size")
      .eq("owner_id", ownerId)
      .neq("status", "deleted");
    if (error) throw Object.assign(new Error(error.message), { code: "ACADEMY_VIDEO_READ_FAILED" });
    return ((data || []) as Array<{ file_size: number }>).reduce((sum, v) => sum + (v.file_size || 0), 0);
  }

  public static getQuota(plan: SubscriptionPlan | string | null): number {
    const entitlements = getUserEntitlements({ subscriptionPlan: plan });
    return entitlements.video_storage_limit_bytes;
  }

  public static async canAcceptUpload(params: {
    ownerId: string;
    plan: SubscriptionPlan | string | null;
    incomingBytes: number;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    const quota = this.getQuota(params.plan);
    if (quota <= 0) {
      return { ok: false, error: "O plano Básico não inclui armazenamento de vídeo AgriAcademy." };
    }
    const used = await this.getUsageBytes(params.ownerId);
    if (used + params.incomingBytes > quota) {
      return { ok: false, error: "Limite de armazenamento atingido." };
    }
    return { ok: true };
  }

  public static async listByOwner(ownerId: string): Promise<AcademyVideoRecord[]> {
    const supabase = getMediaSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("owner_id", ownerId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    if (error) throw Object.assign(new Error(error.message), { code: "ACADEMY_VIDEO_READ_FAILED" });
    return (data || []) as unknown as AcademyVideoRecord[];
  }

  /**
   * Reconciles the owner's library with Bunny Stream before returning it.
   * Removes DB rows whose Bunny assets were deleted; syncs status/metadata for the rest.
   */
  public static async listByOwnerSynced(ownerId: string): Promise<AcademyVideoRecord[]> {
    const videos = await this.listByOwner(ownerId);
    if (!isBunnyConfigured() || videos.length === 0) {
      return videos;
    }

    const remoteVideos = await listBunnyLibraryVideos();
    const remoteByGuid = new Map(remoteVideos.map((item) => [item.guid, item]));
    const supabase = getMediaSupabaseClient();
    const kept: AcademyVideoRecord[] = [];

    for (const video of videos) {
      const remote = video.bunny_video_id ? remoteByGuid.get(video.bunny_video_id) ?? null : null;
      const plan = planLibraryReconcile({ video, remote });

      if (plan.action === "remove") {
        await (supabase.from(TABLE) as any)
          .update({
            status: "deleted",
            orphaned_at: video.orphaned_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", video.id)
          .eq("owner_id", ownerId);
        continue;
      }

      if (plan.action === "mark_failed") {
        await (supabase.from(TABLE) as any)
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", video.id)
          .eq("owner_id", ownerId);
        continue;
      }

      if (plan.action === "sync" && video.bunny_video_id && remote) {
        const updated = await this.markStatusByBunnyId(video.bunny_video_id, remote.status, {
          thumbnail_url: remote.thumbnailUrl ?? video.thumbnail_url ?? null,
          duration_seconds: remote.durationSeconds ?? video.duration_seconds ?? null,
        });
        kept.push(updated ?? { ...video, status: remote.status });
        continue;
      }

      kept.push(video);
    }

    return kept.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public static async createUpload(params: {
    ownerId: string;
    plan: SubscriptionPlan | string | null;
    title: string;
    filename: string;
    mimeType: string;
    fileSize: number;
  }): Promise<{ video: AcademyVideoRecord; upload: Awaited<ReturnType<typeof createBunnyVideo>> }> {
    const allowed = await this.canAcceptUpload({
      ownerId: params.ownerId,
      plan: params.plan,
      incomingBytes: params.fileSize,
    });
    if (!allowed.ok) {
      throw new Error(allowed.error);
    }

    const bunny = await createBunnyVideo({ title: params.title });

    const supabase = getMediaSupabaseClient();
    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        owner_id: params.ownerId,
        bunny_video_id: bunny.bunnyVideoId,
        bunny_library_id: bunny.bunnyLibraryId,
        title: params.title,
        filename: params.filename,
        mime_type: params.mimeType,
        file_size: params.fileSize,
        status: bunny.configured ? "uploading" : "pending",
        visibility: "enrolled_only",
        reference_count: 0,
      })
      .select()
      .single();
    if (error || !data) {
      throw Object.assign(new Error(error?.message || "Não foi possível registar o vídeo."), {
        code: "ACADEMY_VIDEO_INSERT_FAILED",
      });
    }

    return { video: data as unknown as AcademyVideoRecord, upload: bunny };
  }

  /** Used by the Bunny webhook — the only durable write path for encoding status. */
  public static async markStatusByBunnyId(
    bunnyVideoId: string,
    status: AcademyVideoRecord["status"],
    extras?: Partial<AcademyVideoRecord>
  ): Promise<AcademyVideoRecord | null> {
    const supabase = getMediaSupabaseClient();
    const { data: existing } = await supabase
      .from(TABLE)
      .select("bunny_video_id, bunny_library_id, playback_url")
      .eq("bunny_video_id", bunnyVideoId)
      .maybeSingle();
    const current = existing as Pick<
      AcademyVideoRecord,
      "bunny_video_id" | "bunny_library_id" | "playback_url"
    > | null;

    const patch: Partial<AcademyVideoRecord> & { updated_at: string } = {
      ...extras,
      status,
      updated_at: new Date().toISOString(),
    };

    if (
      status === "ready" &&
      current?.bunny_video_id &&
      !patch.playback_url &&
      !current.playback_url
    ) {
      const libraryId = current.bunny_library_id || getBunnyConfig().libraryId || null;
      if (libraryId) {
        patch.playback_url = getBunnyEmbedUrl(libraryId, current.bunny_video_id);
      }
    }

    const { data } = await (supabase.from(TABLE) as any)
      .update(patch)
      .eq("bunny_video_id", bunnyVideoId)
      .select()
      .maybeSingle();
    return (data as unknown as AcademyVideoRecord | null) || null;
  }

  public static async deleteVideo(
    videoId: string,
    ownerId: string,
    options: { force?: boolean } = {}
  ): Promise<{ ok: boolean; reason?: string }> {
    const supabase = getMediaSupabaseClient();
    const { data: current } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", videoId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    const video = current as unknown as AcademyVideoRecord | null;
    if (!video) return { ok: false, reason: "not_found" };

    const refCount = video.reference_count ?? 0;
    if (!options.force && refCount > 0) {
      return { ok: false, reason: "referenced" };
    }

    if (video.bunny_video_id && refCount === 0) {
      await deleteBunnyVideo(video.bunny_video_id);
    }

    await (supabase.from(TABLE) as any)
      .update({ status: "deleted", updated_at: new Date().toISOString() })
      .eq("id", videoId)
      .eq("owner_id", ownerId);
    return { ok: true };
  }

  public static isOrphaned(video: Pick<AcademyVideoRecord, "reference_count" | "orphaned_at">): boolean {
    return (video.reference_count ?? 0) === 0 || Boolean(video.orphaned_at);
  }

  /** Poll Bunny after a successful TUS upload (webhook may be unreachable in dev). */
  public static async syncStatusAfterUpload(
    videoId: string,
    ownerId: string
  ): Promise<AcademyVideoRecord | null> {
    const supabase = getMediaSupabaseClient();
    const { data: current } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", videoId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    const video = current as unknown as AcademyVideoRecord | null;
    if (!video?.bunny_video_id) return video;

    const remote = await fetchBunnyVideoStatus(video.bunny_video_id);
    const status = remote?.status ?? "processing";
    return this.markStatusByBunnyId(video.bunny_video_id, status, {
      thumbnail_url: remote?.thumbnailUrl ?? video.thumbnail_url ?? null,
    });
  }

  /** Instructor media-library preview — owner-only, resolves Bunny embed URLs server-side. */
  public static async resolveOwnerPreview(
    videoId: string,
    ownerId: string
  ): Promise<{ embedUrl: string | null; ready: boolean; status: AcademyVideoRecord["status"] } | null> {
    const supabase = getMediaSupabaseClient();
    const { data: current } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", videoId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    const video = current as unknown as AcademyVideoRecord | null;
    if (!video) return null;

    const embedUrl = await resolvePlaybackEmbedUrl(video);
    if (embedUrl && video.bunny_video_id && (video.status !== "ready" || !video.playback_url)) {
      await this.markStatusByBunnyId(video.bunny_video_id, "ready", {
        playback_url: embedUrl,
        thumbnail_url: video.thumbnail_url ?? undefined,
      });
    }

    return {
      embedUrl,
      ready: Boolean(embedUrl),
      status: embedUrl ? "ready" : video.status,
    };
  }

  public static reconcile(params: { bunnyVideoId?: string | null; hasBunny: boolean; hasRecord: boolean }): "ok" | "orphan_bunny" | "video_unavailable" {
    if (params.hasBunny && !params.hasRecord) return "orphan_bunny";
    if (params.hasRecord && params.bunnyVideoId && !params.hasBunny) return "video_unavailable";
    return "ok";
  }

  public static isInfrastructureReady() {
    return isBunnyConfigured();
  }
}
