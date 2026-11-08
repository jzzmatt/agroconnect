import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { ProductVideoUploader } from "@/components/shopping/ProductVideoUploader";
import { ProductThumbnailOfferModal } from "@/components/shopping/ProductThumbnailOfferModal";
import { publishVideoGate } from "@/lib/products/publish-video-gate";
import { assertProductThumbnailSource } from "@/lib/products/product-thumbnail-source";

const video = {
  file: new File(["video"], "milho.webm", { type: "video/webm" }),
  previewUrl: "",
  duration: 20,
  fileSize: 5,
};

describe("product video save progress", () => {
  it("shows the upload percentage while the video is being saved", () => {
    render(
      <I18nProvider>
        <ProductVideoUploader
          video={video}
          onChange={() => undefined}
          onSave={async () => undefined}
          saveState="saving"
          uploadPercent={42}
        />
      </I18nProvider>
    );

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
    expect(screen.getByText("Envio: 42%")).toBeTruthy();
  });

  it("clears the saving state after a successful save and does not generate a thumbnail", async () => {
    const onSave = vi.fn(async () => undefined);
    const view = render(
      <I18nProvider>
        <ProductVideoUploader
          video={video}
          onChange={() => undefined}
          onSave={onSave}
          saveState="saving"
          uploadPercent={80}
        />
      </I18nProvider>
    );
    expect(screen.getByRole("progressbar")).toBeTruthy();
    view.rerender(
      <I18nProvider>
        <ProductVideoUploader
          video={video}
          onChange={() => undefined}
          onSave={onSave}
          saveState="saved"
          uploadPercent={null}
        />
      </I18nProvider>
    );
    expect(screen.getByText("Vídeo guardado.")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("milho.webm")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar vídeo" }));
    await waitFor(() => expect(onSave).not.toHaveBeenCalled());
  });

  it("shows an error and clears the progress bar when saving fails", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("TEMP_VIDEO_FAILED");
    });
    render(
      <I18nProvider>
        <ProductVideoUploader
          video={video}
          onChange={() => undefined}
          onSave={onSave}
          saveState="idle"
          uploadPercent={null}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar vídeo" }));
    expect(await screen.findByText("Não foi possível guardar o vídeo.")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar vídeo" })).toBeTruthy();
  });
});

describe("optional product thumbnail", () => {
  it("asks for a thumbnail only after the video save succeeds", () => {
    expect(publishVideoGate({ hasVideoFile: true, videoSaved: false, videoSaving: true })).toBe("wait");
    expect(publishVideoGate({ hasVideoFile: true, videoSaved: false, videoSaving: false })).toBe("save_required");
    expect(publishVideoGate({ hasVideoFile: true, videoSaved: true, videoSaving: false })).toBe("ask_thumbnail");
    expect(publishVideoGate({ hasVideoFile: false, videoSaved: false, videoSaving: false })).toBe("continue");
  });

  it("declines or dismisses without generating a thumbnail", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onDismiss = vi.fn();
    render(
      <I18nProvider>
        <ProductThumbnailOfferModal
          open
          generating={false}
          percent={null}
          error={null}
          onAccept={onAccept}
          onDecline={onDecline}
          onDismiss={onDismiss}
          onRetry={onAccept}
        />
      </I18nProvider>
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Não, continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("shows generation progress only after the seller accepts", () => {
    const { rerender } = render(
      <I18nProvider>
        <ProductThumbnailOfferModal
          open={false}
          generating={false}
          percent={null}
          error={null}
          onAccept={() => undefined}
          onDecline={() => undefined}
          onDismiss={() => undefined}
          onRetry={() => undefined}
        />
      </I18nProvider>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(
      <I18nProvider>
        <ProductThumbnailOfferModal
          open
          generating
          percent={35}
          error={null}
          onAccept={() => undefined}
          onDecline={() => undefined}
          onDismiss={() => undefined}
          onRetry={() => undefined}
        />
      </I18nProvider>
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("35");
  });

  it("rejects an unsupported thumbnail source without touching the saved video", () => {
    expect(() => assertProductThumbnailSource("image/gif", 20)).toThrow(/THUMBNAIL_SOURCE_UNSUPPORTED/);
    expect(assertProductThumbnailSource("image/jpeg", 20)).toBe("image/jpeg");
  });
});
