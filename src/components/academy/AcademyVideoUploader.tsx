"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { localizeError } from "@/i18n/errors";
import { waitForAcademyVideoReady } from "@/lib/academy/poll-academy-video-upload";
import type { UploadProgressPhase } from "@/lib/academy/upload-progress";
import { uploadAcademyVideoWithProgress, shouldUseServerBunnyUpload } from "@/lib/academy/upload-academy-video";
import { uploadToBunnyTus } from "@/lib/products/bunny-upload";

type UploadPhase = "idle" | "authorizing" | "uploading" | "success" | "error";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function progressLabel(phase: UploadProgressPhase, dict: ReturnType<typeof useI18n>["dict"]): string {
  if (phase === "transfer") return dict.agriacademy.uploadProgressTransfer;
  if (phase === "bunny-receipt") return dict.agriacademy.uploadProgressBunnyReceipt;
  if (phase === "encoding") return dict.agriacademy.uploadProgressEncoding;
  return dict.agriacademy.uploadProgressReady;
}

export function AcademyVideoUploader({
  remainingBytes,
  onUploaded,
}: {
  remainingBytes: number;
  onUploaded?: () => void;
}) {
  const { dict } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const transferRef = useRef(0);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState<UploadProgressPhase>("transfer");
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePickFile = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError("Formato não suportado. Utilize MP4, WebM ou MOV.");
      setPhase("error");
      resetInput();
      return;
    }

    if (file.size <= 0) {
      setError("O ficheiro selecionado está vazio.");
      setPhase("error");
      resetInput();
      return;
    }

    if (remainingBytes > 0 && file.size > remainingBytes) {
      setError("O vídeo excede a quota de armazenamento disponível no seu plano.");
      setPhase("error");
      resetInput();
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }
    setPhase("idle");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      handlePickFile();
      return;
    }

    setError(null);
    setProgress(0);
    setProgressPhase("transfer");
    transferRef.current = 0;
    setPhase("authorizing");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const createRes = await fetch("/api/academy/video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
        body: JSON.stringify({
          title: title.trim() || selectedFile.name,
          filename: selectedFile.name,
          mimeType: selectedFile.type || "video/mp4",
          fileSize: selectedFile.size,
        }),
      });

      const createPayload = await createRes.json().catch(() => null);
      if (!createRes.ok || !createPayload?.success) {
        const code = createPayload?.code || "BUNNY_UPLOAD_FAILED";
        throw Object.assign(new Error(createPayload?.message || code), { code });
      }

      const upload = createPayload.upload;
      if (
        !upload?.uploadUrl ||
        !upload?.bunnyVideoId ||
        !upload?.bunnyLibraryId ||
        !upload?.authorizationSignature ||
        !upload?.authorizationExpire
      ) {
        throw Object.assign(new Error("BUNNY_NOT_CONFIGURED"), { code: "BUNNY_NOT_CONFIGURED" });
      }

      const videoId = createPayload.video.id as string;
      setPhase("uploading");

      const bunnyReadyPromise = waitForAcademyVideoReady({
        videoId,
        getTransferPercent: () => transferRef.current,
        signal: controller.signal,
        onProgress: (percent, bunnyPhase) => {
          setProgress(percent);
          setProgressPhase(bunnyPhase);
        },
      });

      if (shouldUseServerBunnyUpload(selectedFile.size)) {
        const uploadResult = await uploadAcademyVideoWithProgress({
          videoId,
          file: selectedFile,
          signal: controller.signal,
          onProgress: (percent, transferComplete) => {
            transferRef.current = transferComplete ? 1 : percent / 100;
          },
        });
        if (!uploadResult.success) {
          throw Object.assign(new Error(uploadResult.message || "BUNNY_UPLOAD_FAILED"), {
            code: uploadResult.code || "BUNNY_UPLOAD_FAILED",
          });
        }
      } else {
        await uploadToBunnyTus({
          file: selectedFile,
          uploadUrl: upload.uploadUrl,
          libraryId: upload.bunnyLibraryId,
          videoId: upload.bunnyVideoId,
          signature: upload.authorizationSignature,
          expire: upload.authorizationExpire,
          signal: controller.signal,
          onProgress: (percent) => {
            transferRef.current = percent / 100;
          },
        });

        const completeRes = await fetch("/api/academy/video/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "manual",
          signal: controller.signal,
          body: JSON.stringify({ videoId }),
        });
        const completePayload = await completeRes.json().catch(() => null);
        if (!completeRes.ok || !completePayload?.success) {
          throw Object.assign(new Error(completePayload?.message || "BUNNY_UPLOAD_FAILED"), {
            code: completePayload?.code || "BUNNY_UPLOAD_FAILED",
          });
        }
      }

      transferRef.current = 1;
      await bunnyReadyPromise;

      setProgress(100);
      setProgressPhase("ready");
      setPhase("success");
      setSelectedFile(null);
      setTitle("");
      resetInput();
      onUploaded?.();
    } catch (err: any) {
      if (err?.code === "UPLOAD_ABORTED") return;
      controller.abort();
      const code = err?.code || "BUNNY_UPLOAD_FAILED";
      setError(localizeError(dict, code, err?.message));
      setPhase("error");
    }
  };

  const isBusy = phase === "authorizing" || phase === "uploading";

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => handleFileChange(event.target.files?.[0])}
      />

      <label className="block space-y-1">
        <span className="text-xs font-bold text-foreground">Título da aula</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Introdução à irrigação gota-a-gota"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          disabled={isBusy}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handlePickFile} disabled={isBusy} className="text-xs font-bold">
          {selectedFile ? "Escolher outro ficheiro" : "Selecionar vídeo"}
        </Button>
        <Button type="button" onClick={handleUpload} disabled={isBusy || !selectedFile} className="text-xs font-bold">
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              {dict.agriacademy.videoUploading}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-1.5" />
              Iniciar carregamento seguro
            </>
          )}
        </Button>
      </div>

      {selectedFile && (
        <p className="text-xs text-muted-foreground">
          Ficheiro: <span className="font-semibold text-foreground">{selectedFile.name}</span> ·{" "}
          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
        </p>
      )}

      {isBusy && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              {progressLabel(progressPhase, dict)}
            </span>
            <span className="font-semibold tabular-nums">{progress}%</span>
          </p>
        </div>
      )}

      {phase === "success" && (
        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          {dict.agriacademy.videoUploadComplete}
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
