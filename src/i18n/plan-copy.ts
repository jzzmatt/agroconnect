import type { Dictionary } from "./dictionaries/pt";
import type { SubscriptionPlan } from "@/types/database";

export function getLocalizedPlanCopy(dict: Dictionary, planId: SubscriptionPlan) {
  return dict.pricing.plans[planId];
}

export function formatProductLimitLabel(dict: Dictionary, productLimit: number | null) {
  if (productLimit === null) return dict.pricing.unlimitedProducts;
  if (productLimit === 0) return dict.pricing.browseOnly;
  return dict.pricing.upToProducts.replace("{count}", String(productLimit));
}

export function formatVideoStorageLabel(dict: Dictionary, videoStorageLimitGb: number) {
  if (videoStorageLimitGb === 0) return dict.pricing.noVideoStorage;
  if (videoStorageLimitGb >= 1024) return dict.pricing.videoStorageTb;
  return dict.pricing.videoStorageGb.replace("{gb}", String(videoStorageLimitGb));
}
