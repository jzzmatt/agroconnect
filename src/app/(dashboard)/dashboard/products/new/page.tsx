"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, AlertCircle, Loader2, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ANGOLA_PROVINCES } from "@/config/locations";
import {
  ANIMAL_SPECIES,
  LAND_PROPERTY_TYPES,
  PRODUCT_CATEGORY_SLUGS,
  formatAreaEquivalent,
  productTypeFromCategory,
  type AnimalSex,
  type AnimalSpecies,
  type AnimalUnit,
  type LandAreaUnit,
  type LandPropertyType,
  type LeasePeriod,
  type ListingType,
  type ProductCategorySlug,
} from "@/config/product-catalog";
import { ProductImageUploader } from "@/components/shopping/ProductImageUploader";
import { ProductVideoUploader, type PendingProductVideo } from "@/components/shopping/ProductVideoUploader";
import { compressImageFile } from "@/lib/products/compress-image";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { useI18n } from "@/i18n/provider";
import { localizeError } from "@/i18n/errors";
import { createRequestId, PRODUCT_ERROR_CODES } from "@/lib/products/errors";
import { sanitizePublishError } from "@/lib/products/publish-errors";
import { uploadToImageKit } from "@/lib/products/imagekit-upload";
import type { ProductCondition, ProductAvailabilityStatus, ProductLocationType } from "@/types/database";

export default function NewProductPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const { entitlements, loading, refresh } = useAuthoritativePlan();
  const isBasic = !loading && !entitlements.can_access_agriproduct;
  const [activeCount, setActiveCount] = useState(0);
  const isLimitReached =
    entitlements.product_limit !== null && activeCount >= entitlements.product_limit;

  const [statsLoaded, setStatsLoaded] = useState(false);

  // Limit check is non-blocking: the form renders immediately without waiting
  useEffect(() => {
    // Only check product stats if plan actually has a product limit
    if (entitlements.product_limit !== null) {
      fetch("/api/products/stats", { credentials: "same-origin" })
        .then((res) => res.json())
        .then((data) => {
          if (typeof data?.activeCount === "number") {
            setActiveCount(data.activeCount);
          }
        })
        .catch(() => undefined)
        .finally(() => setStatsLoaded(true));
    } else {
      setStatsLoaded(true);
    }
  }, [entitlements.product_limit]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProductCategorySlug>("sementes-e-fertilizantes");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<ProductCondition>("new");
  const [price, setPrice] = useState<number>(30000);
  const [unit, setUnit] = useState("unidade");
  const [quantity, setQuantity] = useState<number>(1);
  const [sku, setSku] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<ProductAvailabilityStatus>("in_stock");
  const [locationType] = useState<ProductLocationType>("physical_location");
  const [selectedProvince, setSelectedProvince] = useState("Huambo");
  const [selectedMunicipality, setSelectedMunicipality] = useState("Huambo");
  const [sellingRadiusKm, setSellingRadiusKm] = useState<number>(70);
  const [pendingImages, setPendingImages] = useState<Array<{ id: string; url: string; alt_text: string; is_primary: boolean; file: File }>>([]);
  const [pendingVideo, setPendingVideo] = useState<PendingProductVideo | null>(null);

  const [species, setSpecies] = useState<AnimalSpecies>("pigs");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<AnimalSex>("unspecified");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [animalUnit, setAnimalUnit] = useState<AnimalUnit>("unit");
  const [animalNotes, setAnimalNotes] = useState("");

  const [listingType, setListingType] = useState<ListingType>("sale");
  const [propertyType, setPropertyType] = useState<LandPropertyType>("farm");
  const [areaValue, setAreaValue] = useState<number>(1);
  const [areaUnit, setAreaUnit] = useState<LandAreaUnit>("hectare");
  const [leasePeriod, setLeasePeriod] = useState<LeasePeriod>("year");

  const [publishState, setPublishState] = useState<"idle" | "validating" | "uploading_media" | "publishing" | "success" | "error">("idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => createRequestId());

  const productType = productTypeFromCategory(category);
  const areaPreview = useMemo(() => formatAreaEquivalent(areaValue || 0, areaUnit), [areaValue, areaUnit]);

  const resetCategoryExtras = (next: ProductCategorySlug) => {
    setCategory(next);
    if (productTypeFromCategory(next) !== "animal") {
      setSpecies("pigs");
      setBreed("");
    }
    if (productTypeFromCategory(next) !== "land") {
      setListingType("sale");
      setAreaValue(1);
    }
  };

  const busy = publishState === "validating" || publishState === "uploading_media" || publishState === "publishing";

  if (isBasic) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-surface-card rounded-3xl p-8 sm:p-12 border border-border text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full">
              {dict.products.lockedTitle}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">{dict.products.add}</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">{dict.products.lockedBody}</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/planos">
              <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2 font-bold shadow-md">
                <Sparkles className="w-4 h-4" />
                <span>{dict.products.unlock}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-semibold">
                {dict.products.backDashboard}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLimitReached) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-surface-card rounded-3xl p-8 sm:p-12 border border-border text-center space-y-6 shadow-sm">
          <Lock className="w-10 h-10 text-amber-600 mx-auto" />
          <h1 className="text-2xl font-black">{dict.products.limitTenReached}</h1>
          <p className="text-xs text-muted-foreground">{dict.errors.PRODUCT_LIMIT_REACHED}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard/products">
              <Button variant="outline">{dict.products.manageProducts}</Button>
            </Link>
            <Link href="/planos">
              <Button variant="primary">{dict.dash.upgradePlan}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!title.trim() || title.length < 3 || price < 0) {
      setError(dict.errors.VALIDATION_ERROR);
      setPublishState("error");
      return;
    }
    if (productType === "animal" && (!species || quantity < 1)) {
      setError(dict.errors.PRODUCT_ANIMAL_INVALID);
      setPublishState("error");
      return;
    }
    if (productType === "land" && (!areaValue || areaValue <= 0 || !listingType)) {
      setError(dict.errors.PRODUCT_LAND_INVALID);
      setPublishState("error");
      return;
    }

    setPublishState("validating");
    setError(null);
    setSuccessMessage(null);

    try {
      setPublishState("publishing");
      const created = await fetch("/api/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "manual",
        body: JSON.stringify({
          title,
          description,
          condition,
          price,
          unit: productType === "animal" ? animalUnit : unit,
          quantity,
          sku: sku || undefined,
          availabilityStatus,
          locationType,
          sellingRadiusKm,
          status: "published",
          categorySlug: category,
          productType,
          provinceName: selectedProvince,
          municipalityName: selectedMunicipality,
          idempotencyKey,
          metadata: {
            animal:
              productType === "animal"
                ? { species, breed, sex, age, weight, quantity, unit: animalUnit, notes: animalNotes, listing_type: "sale" }
                : undefined,
            land:
              productType === "land"
                ? { listing_type: listingType, property_type: propertyType, area_value: areaValue, area_unit: areaUnit, lease_period: listingType === "lease" ? leasePeriod : undefined }
                : undefined,
          },
        }),
      });

      if (created.type === "opaqueredirect" || [301, 302, 303, 307, 308].includes(created.status)) {
        throw Object.assign(new Error(PRODUCT_ERROR_CODES.AUTH_REQUIRED), { code: PRODUCT_ERROR_CODES.AUTH_REQUIRED });
      }
      const result = await created.json().catch(() => null);
      if (!created.ok || !result?.success || !result.product) {
        const code = sanitizePublishError(result?.code || result?.message, PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_FAILED);
        throw Object.assign(new Error(result?.message || code), { code, message: result?.message });
      }

      let videoProcessing = false;
      if (pendingImages.length || pendingVideo) {
        setPublishState("uploading_media");
      }

      for (const img of pendingImages) {
        const compressed = await compressImageFile(img.file);
        const form = new FormData();
        form.append("productId", result.product.id);
        form.append("file", compressed.file, compressed.fileName);
        form.append("isPrimary", img.is_primary ? "true" : "false");
        form.append("altText", title);
        const uploaded = await fetch("/api/products/images", {
          method: "POST",
          body: form,
          credentials: "same-origin",
          redirect: "manual",
        });
        const payload = await uploaded.json().catch(() => null);
        if (!uploaded.ok || !payload?.success) {
          const errCode = payload?.error || payload?.code || PRODUCT_ERROR_CODES.PRODUCT_IMAGE_FAILED;
          throw Object.assign(new Error(payload?.message || errCode), {
            code: errCode,
            message: payload?.message,
          });
        }
      }

      if (pendingVideo) {
        const videoRes = await fetch("/api/products/video/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "manual",
          body: JSON.stringify({
            productId: result.product.id,
            title,
            filename: pendingVideo.file.name,
            mimeType: pendingVideo.file.type,
            fileSize: pendingVideo.file.size,
            durationSeconds: pendingVideo.duration,
          }),
        });
        const videoResult = await videoRes.json().catch(() => null);
        if (!videoRes.ok || !videoResult?.success) {
          const errCode = videoResult?.code || videoResult?.error || PRODUCT_ERROR_CODES.IMAGEKIT_UPLOAD_FAILED;
          throw Object.assign(new Error(videoResult?.message || errCode), {
            code: errCode,
            message: videoResult?.message,
          });
        }
        const upload = videoResult.upload;
        if (!upload?.uploadUrl || !upload?.publicKey || !upload?.signature || !upload?.token || !upload?.expire) {
          throw Object.assign(new Error(upload?.error || PRODUCT_ERROR_CODES.IMAGEKIT_NOT_CONFIGURED), {
            code: upload?.code || PRODUCT_ERROR_CODES.IMAGEKIT_NOT_CONFIGURED,
            message: upload?.error,
          });
        }
        try {
          const uploaded = await uploadToImageKit({
            file: pendingVideo.file,
            uploadUrl: upload.uploadUrl,
            publicKey: upload.publicKey,
            signature: upload.signature,
            token: upload.token,
            expire: upload.expire,
            folder: upload.folder,
          });
          const confirmRes = await fetch("/api/products/video/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            redirect: "manual",
            body: JSON.stringify({
              videoId: videoResult.video.id,
              productId: result.product.id,
              fileId: uploaded.fileId,
              url: uploaded.url,
              thumbnailUrl: uploaded.thumbnailUrl,
              fileSize: uploaded.size,
            }),
          });
          const confirmResult = await confirmRes.json().catch(() => null);
          if (!confirmRes.ok || !confirmResult?.success) {
            throw Object.assign(new Error(confirmResult?.message || PRODUCT_ERROR_CODES.IMAGEKIT_UPLOAD_FAILED), {
              code: confirmResult?.code || PRODUCT_ERROR_CODES.IMAGEKIT_UPLOAD_FAILED,
            });
          }
          videoProcessing = true;
        } catch (uploadErr: any) {
          throw Object.assign(new Error(uploadErr?.message || PRODUCT_ERROR_CODES.IMAGEKIT_UPLOAD_FAILED), {
            code: uploadErr?.code || PRODUCT_ERROR_CODES.IMAGEKIT_UPLOAD_FAILED,
            message: uploadErr?.message,
          });
        }
      }

      setPublishState("success");
      setSuccessMessage(
        videoProcessing ? dict.products.publishedVideoProcessing : dict.products.publishedOk
      );
      void refresh();
      setTimeout(() => router.push("/dashboard/products"), 1200);
    } catch (err: any) {
      const raw = err?.code || err?.message;
      const isTimeout =
        err?.name === "AbortError" ||
        /aborted|timeout|signal is aborted/i.test(String(err?.message || raw || ""));
      const code = isTimeout
        ? PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_TIMEOUT
        : sanitizePublishError(raw, PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_FAILED);
      setPublishState("error");
      const friendly = localizeError(dict, code, err?.message);
      setError(friendly);
      console.warn("[product publish error]", { code, raw, message: err?.message, friendly });
    } finally {
      setPublishState((current) => (current === "success" ? "success" : current === "error" ? "error" : "idle"));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="w-4 h-4" />
          <span>{dict.products.backToProducts}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">{dict.products.addNew}</h1>
      </div>

      {publishState === "success" ? (
        <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{successMessage || dict.products.publishedOk}</h3>
          <p className="text-xs text-muted-foreground">{dict.products.redirecting}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleSubmit({ preventDefault() {} } as React.FormEvent)}>
                {dict.common.retry}
              </Button>
            </div>
          )}

          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{dict.products.identification}</h3>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1" htmlFor="product-name">
                {dict.products.name} <span className="text-destructive">*</span>
              </label>
              <input id="product-name" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={dict.products.namePlaceholder} className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">{dict.products.category}</label>
                <select value={category} onChange={(e) => resetCategoryExtras(e.target.value as ProductCategorySlug)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold">
                  {PRODUCT_CATEGORY_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {dict.products.categories[slug]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">{dict.products.condition}</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value as ProductCondition)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold">
                  <option value="new">{dict.products.conditionNew}</option>
                  <option value="used">{dict.products.conditionUsed}</option>
                  <option value="not_applicable">{dict.products.conditionNa}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">{dict.products.sku}</label>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">{dict.products.description}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder={dict.products.descriptionPlaceholder} className="w-full p-3 rounded-2xl bg-surface border border-input-border text-xs resize-none" />
            </div>
          </div>

          {productType === "animal" && (
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{dict.products.extraSection}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.animals.species}</label>
                  <select value={species} onChange={(e) => setSpecies(e.target.value as AnimalSpecies)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                    {ANIMAL_SPECIES.map((code) => (
                      <option key={code} value={code}>{dict.animals[code]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.animals.breed}</label>
                  <input value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.animals.sex}</label>
                  <select value={sex} onChange={(e) => setSex(e.target.value as AnimalSex)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                    <option value="male">{dict.animals.male}</option>
                    <option value="female">{dict.animals.female}</option>
                    <option value="mixed">{dict.animals.mixed}</option>
                    <option value="unspecified">{dict.animals.unspecified}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.animals.age}</label>
                  <input value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.animals.weight}</label>
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.animals.unit}</label>
                  <select value={animalUnit} onChange={(e) => setAnimalUnit(e.target.value as AnimalUnit)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                    <option value="unit">{dict.animals.unitLabel}</option>
                    <option value="head">{dict.animals.headLabel}</option>
                  </select>
                </div>
              </div>
              <textarea value={animalNotes} onChange={(e) => setAnimalNotes(e.target.value)} rows={3} placeholder={dict.animals.notes} className="w-full p-3 rounded-2xl bg-surface border border-input-border text-xs resize-none" />
            </div>
          )}

          {productType === "land" && (
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{dict.products.extraSection}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.land.listingType}</label>
                  <select value={listingType} onChange={(e) => setListingType(e.target.value as ListingType)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                    <option value="sale">{dict.land.sale}</option>
                    <option value="lease">{dict.land.lease}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.land.propertyType}</label>
                  <select value={propertyType} onChange={(e) => setPropertyType(e.target.value as LandPropertyType)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                    {LAND_PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type === "raw_land" ? dict.land.rawLand : type === "farm" ? dict.land.farm : dict.land.agriculturalProperty}
                      </option>
                    ))}
                  </select>
                </div>
                {listingType === "lease" && (
                  <div>
                    <label className="text-xs font-bold block mb-1">{dict.land.leasePeriod}</label>
                    <select value={leasePeriod} onChange={(e) => setLeasePeriod(e.target.value as LeasePeriod)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                      <option value="month">{dict.land.month}</option>
                      <option value="year">{dict.land.year}</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.land.area}</label>
                  <input type="number" min={0.01} step={0.01} value={areaValue} onChange={(e) => setAreaValue(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.land.hectare} / {dict.land.sqm}</label>
                  <select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as LandAreaUnit)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                    <option value="hectare">{dict.land.hectare}</option>
                    <option value="sqm">{dict.land.sqm}</option>
                  </select>
                </div>
              </div>
              {areaValue > 0 && (
                <p className="text-xs font-semibold text-primary">
                  {areaPreview.primary} · {dict.land.equivalent}: {areaPreview.equivalent}
                </p>
              )}
            </div>
          )}

          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{dict.products.pricing}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold block mb-1">{dict.products.price}</label>
                <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" required />
              </div>
              {productType !== "land" && (
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.products.stock}</label>
                  <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))} className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold block mb-1">{dict.products.stockStatus}</label>
                <select value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value as ProductAvailabilityStatus)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                  <option value="in_stock">{dict.products.inStock}</option>
                  <option value="limited">{dict.products.limited}</option>
                  <option value="pre_order">{dict.products.preOrder}</option>
                  <option value="out_of_stock">{dict.products.outOfStock}</option>
                </select>
              </div>
              {productType === "standard" && (
                <div>
                  <label className="text-xs font-bold block mb-1">{dict.products.unit}</label>
                  <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{dict.products.locationSection}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold block mb-1">{dict.products.province}</label>
                <select value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs">
                  {ANGOLA_PROVINCES.map((p) => (
                    <option key={p.code} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{dict.products.municipality}</label>
                <input value={selectedMunicipality} onChange={(e) => setSelectedMunicipality(e.target.value)} className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{dict.products.radius}</label>
                <input type="number" min={1} max={200} value={sellingRadiusKm} onChange={(e) => setSellingRadiusKm(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs" />
              </div>
            </div>
          </div>

          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{dict.products.mediaSection}</h3>
            <ProductImageUploader
              images={pendingImages}
              onAdd={(file, dataUrl) => {
                setPendingImages((prev) => [
                  ...prev,
                  { id: `local-${prev.length + 1}`, url: dataUrl, alt_text: title || dict.glossary.product, is_primary: prev.length === 0, file },
                ]);
              }}
              onRemove={(id) => setPendingImages((prev) => prev.filter((i) => i.id !== id))}
              onSetPrimary={(id) => setPendingImages((prev) => prev.map((i) => ({ ...i, is_primary: i.id === id })))}
            />
            <ProductVideoUploader video={pendingVideo} onChange={setPendingVideo} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/dashboard/products">
              <Button variant="outline" size="lg" disabled={busy} type="button">{dict.common.cancel}</Button>
            </Link>
            <Button type="submit" variant="primary" size="lg" disabled={busy} className="gap-2 font-bold px-8">
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{dict.products.publishing}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{dict.products.publish}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
