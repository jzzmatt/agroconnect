"use client";

import React, { useRef } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { validateProductImage, type ProductImageDescriptor } from "@/lib/services/product-media-service";

interface ProductImageUploaderProps {
  images: Array<Pick<ProductImageDescriptor, "id" | "url" | "alt_text" | "is_primary">>;
  onAdd: (file: File, dataUrl: string) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export function ProductImageUploader({
  images,
  onAdd,
  onRemove,
  onSetPrimary,
  disabled,
  error,
}: ProductImageUploaderProps) {
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
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao ler imagem."));
      reader.readAsDataURL(file);
    });
    onAdd(file, dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Imagem do produto</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-xs font-bold"
        >
          <ImagePlus className="w-4 h-4 mr-1.5" />
          Escolher imagem
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}

      {images.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-2xl border border-dashed border-border bg-surface flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 transition-colors"
        >
          <ImagePlus className="w-8 h-8 mb-2" />
          <span className="text-xs font-bold">Arrastar imagem ou escolher ficheiro</span>
          <span className="text-[10px]">JPEG, PNG ou WebP • máx. 5 MB</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative rounded-2xl overflow-hidden border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt_text} className="w-full h-28 object-cover" />
              <div className="absolute inset-x-0 bottom-0 p-1.5 flex items-center justify-between bg-black/50">
                <button
                  type="button"
                  onClick={() => onSetPrimary(img.id)}
                  className="text-[10px] font-bold text-white flex items-center gap-1"
                  aria-label="Definir como imagem principal"
                >
                  <Star className={`w-3.5 h-3.5 ${img.is_primary ? "fill-amber-400 text-amber-400" : ""}`} />
                  {img.is_primary ? "Principal" : "Definir"}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="text-white"
                  aria-label="Remover imagem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
