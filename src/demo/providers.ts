import type { ProviderPublicProfile } from "@/types/agriexpert";
import type { SellerPublicProfile } from "@/types/agrishopping";
import { DEMO_MEDIA } from "./media";

const CREATED_AT = "2026-01-15T09:00:00.000Z";

export type DemoProvider = ProviderPublicProfile & { isDemo: true };

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    isDemo: true,
    id: "demo-provider-huambo",
    profile_id: "demo-profile-huambo",
    business_name: "Cooperativa Agrícola do Planalto",
    slug: "demo-cooperativa-planalto",
    headline: "Sementes certificadas e colheita do Planalto Central",
    description:
      "Cooperativa de Caála que reúne produtores de milho, feijão e hortícolas. A apresentação mostra o catálogo público, sem conta real de vendedor.",
    provider_type: "cooperative",
    avatar_url: DEMO_MEDIA.produce,
    banner_url: DEMO_MEDIA.seeds,
    phone: "+244 923 010 101",
    email: "demo.planalto@agroconnect.ao",
    website: null,
    verification_status: "verified",
    status: "active",
    rating: 4.8,
    reviews_count: 36,
    province_name: "Huambo",
    municipality_name: "Caála",
    latitude: -12.8525,
    longitude: 15.5606,
    service_radius_km: 80,
    services_count: 2,
    created_at: CREATED_AT,
  },
  {
    isDemo: true,
    id: "demo-provider-benguela",
    profile_id: "demo-profile-benguela",
    business_name: "Oficina Agrícola do Lobito",
    slug: "demo-oficina-lobito",
    headline: "Rega, máquinas e transporte para a faixa costeira",
    description:
      "Oficina de Benguela especializada em bombagem, motocultivadores e transporte de insumos entre o porto e as fazendas do interior.",
    provider_type: "equipment_supplier",
    avatar_url: DEMO_MEDIA.equipment,
    banner_url: DEMO_MEDIA.irrigation,
    phone: "+244 924 020 202",
    email: "demo.lobito@agroconnect.ao",
    website: null,
    verification_status: "verified",
    status: "active",
    rating: 4.7,
    reviews_count: 28,
    province_name: "Benguela",
    municipality_name: "Lobito",
    latitude: -12.3648,
    longitude: 13.536,
    service_radius_km: 140,
    services_count: 3,
    created_at: CREATED_AT,
  },
  {
    isDemo: true,
    id: "demo-provider-malanje",
    profile_id: "demo-profile-malanje",
    business_name: "Clínica Veterinária do Campo",
    slug: "demo-clinica-campo-malanje",
    headline: "Sanidade animal e assessoria de exploração",
    description:
      "Equipa veterinária em Cacuso. Acompanha rebanhos, calendários de vacinação e planos simples de maneio para pequenas e médias fazendas.",
    provider_type: "veterinarian",
    avatar_url: DEMO_MEDIA.veterinary,
    banner_url: DEMO_MEDIA.animalHealth,
    phone: "+244 925 030 303",
    email: "demo.malanje@agroconnect.ao",
    website: null,
    verification_status: "verified",
    status: "active",
    rating: 4.9,
    reviews_count: 41,
    province_name: "Malanje",
    municipality_name: "Cacuso",
    latitude: -9.4167,
    longitude: 15.75,
    service_radius_km: 90,
    services_count: 2,
    created_at: CREATED_AT,
  },
];

export const DEMO_SELLERS: Array<SellerPublicProfile & { isDemo: true }> = DEMO_PROVIDERS.map(
  (provider) => ({
    ...provider,
    isDemo: true,
    selling_radius_km: provider.service_radius_km,
    products_count: 2,
  })
);

export function demoProviderById(id: string): DemoProvider | undefined {
  return DEMO_PROVIDERS.find((provider) => provider.id === id);
}
