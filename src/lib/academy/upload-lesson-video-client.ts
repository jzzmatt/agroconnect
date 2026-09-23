export async function uploadLessonVideoWithProgress(params: {
  signedUrl: string;
  file: File;
  mimeType: string;
  onProgress?: (loaded: number, total: number) => void;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", params.signedUrl);
    xhr.setRequestHeader("Content-Type", params.mimeType);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      params.onProgress?.(event.loaded, event.total);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("UPLOAD_FAILED"));
    });

    xhr.addEventListener("error", () => reject(new Error("UPLOAD_FAILED")));
    xhr.addEventListener("abort", () => reject(new Error("UPLOAD_ABORTED")));

    xhr.send(params.file);
  });
}
