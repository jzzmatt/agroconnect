const MAX_EDGE = 1280;
const QUALITY = 0.72;

export async function compressImageFile(file: File): Promise<{
  file: File;
  dataUrl: string;
  fileSize: number;
  mimeType: string;
  fileName: string;
}> {
  const fileName = file.name.replace(/\.\w+$/, ".jpg");
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return {
      file,
      dataUrl: "",
      fileSize: file.size,
      mimeType: file.type || "image/jpeg",
      fileName,
    };
  }

  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { file, dataUrl, fileSize: file.size, mimeType: file.type, fileName: file.name };
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error("image_compress_failed"))), "image/jpeg", QUALITY);
  });
  const compressedFile = new File([blob], fileName, { type: "image/jpeg" });
  const compressed = canvas.toDataURL("image/jpeg", QUALITY);
  return {
    file: compressedFile,
    dataUrl: compressed,
    fileSize: compressedFile.size,
    mimeType: "image/jpeg",
    fileName,
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