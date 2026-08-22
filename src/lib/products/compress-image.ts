const MAX_EDGE = 1600;
const QUALITY = 0.78;

export async function compressImageFile(file: File): Promise<{ dataUrl: string; fileSize: number; mimeType: string; fileName: string }> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    const dataUrl = await readAsDataUrl(file);
    return { dataUrl, fileSize: file.size, mimeType: file.type, fileName: file.name };
  }

  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl, fileSize: file.size, mimeType: file.type, fileName: file.name };
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/jpeg", QUALITY);
  const approxBytes = Math.ceil((compressed.length * 3) / 4);
  return {
    dataUrl: compressed,
    fileSize: approxBytes,
    mimeType: "image/jpeg",
    fileName: file.name.replace(/\.\w+$/, ".jpg"),
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("image_read_failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image_decode_failed"));
    image.src = src;
  });
}

export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video_metadata_failed"));
    };
    video.src = url;
  });
}
