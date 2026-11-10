"use client";

import { useEffect, useRef, useState } from "react";
import { ProductImageUploader } from "@/components/shopping/ProductImageUploader";
import { ProductVideoUploader, type PendingProductVideo } from "@/components/shopping/ProductVideoUploader";
import { useI18n } from "@/i18n/provider";
import { uploadServiceVideo } from "@/lib/services/service-video-upload-client";

type ServiceImage = { id: string; url: string; alt_text: string; is_primary: boolean };

export function ServiceMediaControls({ serviceId }: { serviceId: string }) {
  const { dict } = useI18n();
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [video, setVideo] = useState<PendingProductVideo | null>(null);
  const [videoSaveState, setVideoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [videoUploadPercent, setVideoUploadPercent] = useState<number | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const requestId = useRef(crypto.randomUUID());
  const localVideo = useRef(false);

  const reload = async () => {
    const response = await fetch(`/api/services/${serviceId}/media`, { credentials: "same-origin" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) return;
    setImages(Array.isArray(payload.images) ? payload.images : []);
    if (localVideo.current) return;
    if (payload.video?.url) {
      setVideo({
        file: new File([], "video.mp4", { type: "video/mp4" }),
        previewUrl: payload.video.url,
        duration: Number(payload.video.durationSeconds) || 0,
        fileSize: Number(payload.video.fileSize) || 0,
      });
      setVideoSaveState("saved");
      return;
    }
    setVideo(null);
    setVideoSaveState("idle");
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{dict.agriexpert.mediaSection}</h3>
      <ProductImageUploader
        images={images}
        error={imageError}
        title={dict.agriexpert.servicePhoto}
        onAdd={async (file) => {
          setImageError(null);
          const form = new FormData();
          form.append("file", file);
          const response = await fetch(`/api/services/${serviceId}/images`, {
            method: "POST",
            credentials: "same-origin",
            body: form,
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.success) {
            setImageError(dict.agriexpert.mediaFailed);
            return;
          }
          await reload();
        }}
        onRemove={async (id) => {
          await fetch(`/api/services/${serviceId}/images/${id}`, { method: "DELETE", credentials: "same-origin" });
          await reload();
        }}
        onSetPrimary={async (id) => {
          await fetch(`/api/services/${serviceId}/images/${id}/primary`, { method: "POST", credentials: "same-origin" });
          await reload();
        }}
      />
      <ProductVideoUploader
        video={video}
        saveState={videoSaveState}
        uploadPercent={videoUploadPercent}
        onChange={(next) => {
          if (!next) {
            localVideo.current = false;
            setVideoSaveState("idle");
            setVideoUploadPercent(null);
            requestId.current = crypto.randomUUID();
            void fetch(`/api/services/${serviceId}/video`, { method: "DELETE", credentials: "same-origin" });
          } else if (next.file !== video?.file) {
            localVideo.current = true;
            setVideoSaveState("idle");
            requestId.current = crypto.randomUUID();
          }
          setVideo(next);
        }}
        onSaveStart={() => {
          setVideoSaveState("saving");
          setVideoUploadPercent(0);
        }}
        onSave={async (file, duration) => {
          try {
            await uploadServiceVideo({
              serviceId,
              file,
              clientRequestId: requestId.current,
              durationSeconds: duration,
              onProgress: setVideoUploadPercent,
            });
            setVideoSaveState("saved");
          } catch (error) {
            setVideoSaveState("error");
            throw error;
          } finally {
            setVideoUploadPercent(null);
          }
        }}
      />
    </div>
  );
}
