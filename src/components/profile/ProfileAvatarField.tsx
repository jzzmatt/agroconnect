"use client";

import React, { useRef, useState } from "react";
import { Avatar, Button } from "@/components/ui";
import { Camera, Trash2 } from "lucide-react";
import { notifyProfileChanged } from "@/lib/auth/profile-events";

export function ProfileAvatarField(props: {
  displayName: string;
  avatarUrl: string | null;
  onAvatarUrlChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload.url) {
        throw new Error(payload?.message || "Não foi possível carregar a fotografia.");
      }
      props.onAvatarUrlChange(payload.url);
      notifyProfileChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a fotografia.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Não foi possível remover a fotografia.");
      }
      props.onAvatarUrlChange(null);
      notifyProfileChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a fotografia.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar src={props.avatarUrl} fallbackText={props.displayName} size="xl" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="gap-1.5 font-bold"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="w-3.5 h-3.5" />
            {uploading ? "A carregar..." : "Alterar fotografia"}
          </Button>
          {props.avatarUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              className="gap-1.5 font-bold"
              onClick={remove}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">JPEG, PNG ou WebP. Máximo 5 MB.</p>
        {error ? <p className="text-[11px] font-bold text-red-600">{error}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}
