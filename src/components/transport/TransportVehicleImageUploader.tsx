"use client";

import React, { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { validateProductImage } from "@/lib/services/product-media-service";

export function TransportVehicleImageUploader({
  previewUrl,
  onSelect,
  disabled,
}: {
  previewUrl: string | null;
  onSelect: (file: File, preview: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const validation = validateProductImage({
      mimeType: file.type,
      fileSize: file.size,
      fileName: file.name,
    });
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    const preview = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao ler imagem."));
      reader.readAsDataURL(file);
    });
    onSelect(file, preview);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-muted-foreground">
          Imagem do veículo <span className="font-normal">(opcional)</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-xs font-bold gap-1.5"
        >
          <ImagePlus className="w-4 h-4" />
          Escolher imagem
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Pré-visualização do veículo" className="w-full max-h-48 rounded-2xl object-cover border border-border" />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 rounded-2xl border border-dashed border-border bg-surface flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40"
        >
          <ImagePlus className="w-7 h-7 mb-1" />
          <span className="text-xs font-bold">JPEG, PNG ou WebP • máx. 5 MB</span>
        </button>
      )}
    </div>
  );
}
