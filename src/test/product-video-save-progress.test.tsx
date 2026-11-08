import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { ProductVideoUploader } from "@/components/shopping/ProductVideoUploader";

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
});
