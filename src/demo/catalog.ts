import type { CourseListItem, CourseWithSections } from "@/types/agriacademy";
import type { PublicProviderIdentity } from "@/types/agriprofile";
import type { ProviderPublicProfile, ServiceListItem } from "@/types/agriexpert";
import type { ProductListItem, SellerPublicProfile } from "@/types/agrishopping";
import { DEMO_COURSE_LIST, DEMO_COURSES } from "./courses";
import { DEMO_PRODUCTS } from "./products";
import { DEMO_PROVIDERS, DEMO_SELLERS } from "./providers";
import { DEMO_SERVICES } from "./services";
import { loadDemoVisibility, selectDemoRecords, type DemoVisibility } from "./visibility";

export const DEMO_CATALOG_FLAG = "NEXT_PUBLIC_AGROCONNECT_DEMO_CATALOG";
export const DEMO_PERSISTENCE_MESSAGE = "Este conteúdo de demonstração não pode ser guardado.";

export function isDemoCatalogEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AGROCONNECT_DEMO_CATALOG === "true";
}

type DemoReadOptions = { enabled?: boolean };

function demoReadEnabled(options?: DemoReadOptions): boolean {
  return options?.enabled ?? isDemoCatalogEnabled();
}

export function resolveDemoVisibility(): Promise<DemoVisibility> {
  return loadDemoVisibility(isDemoCatalogEnabled());
}

export function isDemoRecordId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("demo-");
}

export function assertDemoNotPersisted(value: string | null | undefined): void {
  if (isDemoRecordId(value)) {
    throw new Error(DEMO_PERSISTENCE_MESSAGE);
  }
}

type CatalogFilter = {
  query?: string;
  categorySlug?: string;
  provinceName?: string;
  municipalityName?: string;
  minPrice?: number;
  maxPrice?: number;
  availabilityStatus?: string;
  pricingType?: string;
  level?: string;
};

function matchesQuery(query: string | undefined, parts: Array<string | null | undefined>): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return parts.some((part) => part?.toLowerCase().includes(needle));
}

function matchesPlace(filter: CatalogFilter, province?: string | null, municipality?: string | null): boolean {
  if (filter.provinceName && province?.toLowerCase() !== filter.provinceName.toLowerCase()) return false;
  if (filter.municipalityName && municipality?.toLowerCase() !== filter.municipalityName.toLowerCase()) return false;
  return true;
}

function matchesPrice(filter: CatalogFilter, price: number): boolean {
  if (filter.minPrice !== undefined && price < filter.minPrice) return false;
  if (filter.maxPrice !== undefined && price > filter.maxPrice) return false;
  return true;
}

export function demoProductsForPublic(filter: CatalogFilter = {}, options?: DemoReadOptions) {
  if (!demoReadEnabled(options)) return [];
  return DEMO_PRODUCTS.filter(
    (product) =>
      product.status === "published" &&
      matchesQuery(filter.query, [product.title, product.description, product.seller_name]) &&
      (!filter.categorySlug || product.category_slug === filter.categorySlug) &&
      matchesPlace(filter, product.province_name, product.municipality_name) &&
      (!filter.availabilityStatus || product.availability_status === filter.availabilityStatus) &&
      matchesPrice(filter, product.price)
  );
}

export function demoProductBySlug(slug: string, options?: DemoReadOptions): ProductListItem | null {
  if (!demoReadEnabled(options)) return null;
  return DEMO_PRODUCTS.find((product) => product.slug === slug && product.status === "published") ?? null;
}

export function demoProductsForSeller(
  sellerId: string,
  onlyPublished = true,
  options?: DemoReadOptions
): ProductListItem[] {
  if (!demoReadEnabled(options) || !isDemoRecordId(sellerId)) return [];
  return DEMO_PRODUCTS.filter(
    (product) => product.seller_id === sellerId && (!onlyPublished || product.status === "published")
  );
}

export function demoSellerBySlug(slug: string, options?: DemoReadOptions): SellerPublicProfile | null {
  if (!demoReadEnabled(options)) return null;
  return DEMO_SELLERS.find((seller) => seller.slug === slug) ?? null;
}

export function demoServicesForPublic(filter: CatalogFilter = {}, options?: DemoReadOptions) {
  if (!demoReadEnabled(options)) return [];
  return DEMO_SERVICES.filter(
    (service) =>
      service.status === "published" &&
      matchesQuery(filter.query, [service.title, service.short_description, service.provider_name]) &&
      (!filter.categorySlug || service.category_slug === filter.categorySlug) &&
      matchesPlace(filter, service.province_name, service.municipality_name) &&
      (!filter.pricingType || service.pricing_type === filter.pricingType) &&
      matchesPrice(filter, service.price)
  );
}

export function demoServiceBySlug(slug: string, options?: DemoReadOptions): ServiceListItem | null {
  if (!demoReadEnabled(options)) return null;
  return DEMO_SERVICES.find((service) => service.slug === slug && service.status === "published") ?? null;
}

export function demoServicesForProvider(providerId: string, options?: DemoReadOptions): ServiceListItem[] {
  if (!demoReadEnabled(options) || !isDemoRecordId(providerId)) return [];
  return DEMO_SERVICES.filter((service) => service.provider_id === providerId && service.status === "published");
}

export function demoProviderBySlug(slug: string, options?: DemoReadOptions): ProviderPublicProfile | null {
  if (!demoReadEnabled(options)) return null;
  return DEMO_PROVIDERS.find((provider) => provider.slug === slug) ?? null;
}

export function demoPublicProvider(slugOrId: string, options?: DemoReadOptions): PublicProviderIdentity | null {
  if (!demoReadEnabled(options)) return null;
  const provider = DEMO_PROVIDERS.find((item) => item.slug === slugOrId || item.id === slugOrId);
  if (!provider) return null;
  return {
    id: provider.id,
    slug: provider.slug,
    display_name: provider.business_name,
    professional_title: null,
    professional_category: provider.provider_type,
    headline: provider.headline ?? null,
    description: provider.description ?? null,
    avatar_url: provider.avatar_url ?? null,
    website: provider.website ?? null,
    email: provider.email ?? null,
    whatsapp_phone: provider.phone ?? null,
    province_name: provider.province_name ?? null,
    municipality_name: provider.municipality_name ?? null,
    areas_of_work: [],
    verification_status: provider.verification_status,
    published_at: provider.created_at,
  };
}

export function demoCoursesForPublic(filter: CatalogFilter = {}, options?: DemoReadOptions) {
  if (!demoReadEnabled(options)) return [];
  return DEMO_COURSE_LIST.filter(
    (course) =>
      course.status === "published" &&
      matchesQuery(filter.query, [course.title, course.description, course.short_description, course.instructor_name]) &&
      (!filter.categorySlug || course.category_slug === filter.categorySlug) &&
      matchesPlace(filter, course.province_name, course.municipality_name) &&
      (!filter.level || course.level === filter.level) &&
      matchesPrice(filter, course.price)
  );
}

export function demoCourseBySlug(slug: string, options?: DemoReadOptions): CourseListItem | null {
  if (!demoReadEnabled(options)) return null;
  return DEMO_COURSE_LIST.find((course) => course.slug === slug && course.status === "published") ?? null;
}

export function demoCourseDetailBySlug(slug: string, options?: DemoReadOptions): CourseWithSections | null {
  if (!demoReadEnabled(options)) return null;
  return DEMO_COURSES.find((course) => course.slug === slug && course.status === "published") ?? null;
}

export function appendDemoPage<Real extends { id: string }, Extra extends { id: string }>(
  realItems: Real[],
  realTotal: number,
  demoItems: Extra[],
  offset = 0,
  limit = 20
): { items: Array<Real | Extra>; total: number } {
  const extras = demoItems.filter((item) => !realItems.some((real) => real.id === item.id));
  if (extras.length === 0) return { items: realItems, total: realTotal };
  const total = realTotal + extras.length;
  const pageEnd = offset + limit;
  if (pageEnd <= realTotal) return { items: realItems, total };
  const demoFrom = Math.max(0, offset - realTotal);
  const demoTo = Math.max(0, pageEnd - realTotal);
  return { items: [...realItems, ...extras.slice(demoFrom, demoTo)], total };
}

async function visibleDemo<T extends { id: string }>(records: T[]): Promise<T[]> {
  return selectDemoRecords(records, await resolveDemoVisibility());
}

export async function visibleDemoProducts(filter: CatalogFilter = {}) {
  const visibility = await resolveDemoVisibility();
  return selectDemoRecords(demoProductsForPublic(filter, { enabled: visibility.mode !== "none" }), visibility);
}

export async function visibleDemoProductBySlug(slug: string) {
  const visibility = await resolveDemoVisibility();
  const product = demoProductBySlug(slug, { enabled: visibility.mode !== "none" });
  if (!product) return null;
  return selectDemoRecords([product], visibility)[0] ?? null;
}

export async function visibleDemoProductsForSeller(sellerId: string, onlyPublished = true) {
  const visibility = await resolveDemoVisibility();
  return selectDemoRecords(
    demoProductsForSeller(sellerId, onlyPublished, { enabled: visibility.mode !== "none" }),
    visibility
  );
}

export async function visibleDemoServices(filter: CatalogFilter = {}) {
  const visibility = await resolveDemoVisibility();
  return selectDemoRecords(demoServicesForPublic(filter, { enabled: visibility.mode !== "none" }), visibility);
}

export async function visibleDemoServiceBySlug(slug: string) {
  const visibility = await resolveDemoVisibility();
  const service = demoServiceBySlug(slug, { enabled: visibility.mode !== "none" });
  if (!service) return null;
  return selectDemoRecords([service], visibility)[0] ?? null;
}

export async function visibleDemoServicesForProvider(providerId: string) {
  const visibility = await resolveDemoVisibility();
  return selectDemoRecords(
    demoServicesForProvider(providerId, { enabled: visibility.mode !== "none" }),
    visibility
  );
}

export async function visibleDemoProviderBySlug(slug: string) {
  const visibility = await resolveDemoVisibility();
  const provider = demoProviderBySlug(slug, { enabled: visibility.mode !== "none" });
  if (!provider) return null;
  return selectDemoRecords([provider], visibility)[0] ?? null;
}

export async function visibleDemoPublicProvider(slugOrId: string) {
  const visibility = await resolveDemoVisibility();
  const provider = demoPublicProvider(slugOrId, { enabled: visibility.mode !== "none" });
  if (!provider) return null;
  return selectDemoRecords([provider], visibility)[0] ?? null;
}

export async function visibleDemoCourses(filter: CatalogFilter = {}) {
  const visibility = await resolveDemoVisibility();
  return selectDemoRecords(demoCoursesForPublic(filter, { enabled: visibility.mode !== "none" }), visibility);
}

export async function visibleDemoCourseBySlug(slug: string) {
  const visibility = await resolveDemoVisibility();
  const course = demoCourseBySlug(slug, { enabled: visibility.mode !== "none" });
  if (!course) return null;
  return selectDemoRecords([course], visibility)[0] ?? null;
}

export async function visibleDemoCourseDetailBySlug(slug: string) {
  const visibility = await resolveDemoVisibility();
  const course = demoCourseDetailBySlug(slug, { enabled: visibility.mode !== "none" });
  if (!course) return null;
  return (await visibleDemo([course]))[0] ?? null;
}

export const DEMO_CATALOG_COUNTS = {
  products: DEMO_PRODUCTS.length,
  courses: DEMO_COURSES.length,
  services: DEMO_SERVICES.length,
  providers: DEMO_PROVIDERS.length,
} as const;
