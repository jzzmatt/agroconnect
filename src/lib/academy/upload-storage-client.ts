/**
 * Browser upload to a Supabase signed upload URL.
 * The storage API expects the same multipart body as `uploadToSignedUrl`:
 * the file is a form field, and `x-upsert` allows a replacement.
 */
export async function uploadBlobWithProgress(params: {
  signedUrl: string;
  file: File | Blob;
  mimeType: string;
  onProgress?: (loaded: number, total: number) => void;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", params.signedUrl);
    xhr.setRequestHeader("x-upsert", "true");

    const body = new FormData();
    body.append("cacheControl", "3600");
    const fileName = params.file instanceof File && params.file.name ? params.file.name : "upload";
    const file =
      params.file.type || !params.mimeType
        ? params.file
        : new File([params.file], fileName, { type: params.mimeType });
    body.append("", file, fileName);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      params.onProgress?.(event.loaded, event.total);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("MEDIA_UPLOAD_FAILED"));
    });

    xhr.addEventListener("error", () => reject(new Error("MEDIA_UPLOAD_FAILED")));
    xhr.addEventListener("abort", () => reject(new Error("UPLOAD_ABORTED")));

    xhr.send(body);
  });
}
