import type { ServiceListItem } from "@/types/agriexpert";
import { DEMO_MEDIA } from "./media";
import { demoProviderById } from "./providers";

const CREATED_AT = "2026-01-15T09:00:00.000Z";

export type DemoService = ServiceListItem & { isDemo: true };

function provider(providerId: string) {
  const match = demoProviderById(providerId);
  if (!match) throw new Error(`Demo provider em falta: ${providerId}`);
  return match;
}

function service(
  input: Omit<
    DemoService,
    | "isDemo"
    | "provider_name"
    | "provider_slug"
    | "provider_avatar_url"
    | "provider_rating"
    | "provider_reviews_count"
    | "provider_verified"
    | "currency"
    | "created_at"
  > & { provider_id: string }
): DemoService {
  const owner = provider(input.provider_id);
  return {
    ...input,
    isDemo: true,
    provider_name: owner.business_name,
    provider_slug: owner.slug,
    provider_avatar_url: owner.avatar_url,
    provider_rating: owner.rating,
    provider_reviews_count: owner.reviews_count,
    provider_verified: true,
    currency: "AOA",
    created_at: CREATED_AT,
  };
}

export const DEMO_SERVICES: DemoService[] = [
  service({
    id: "demo-service-agronomia",
    provider_id: "demo-provider-huambo",
    category_id: "demo-category-agronomy",
    category_name: "Agronomia",
    category_slug: "agronomia",
    title: "Visita agronómica de diagnóstico da parcela",
    slug: "demo-visita-agronomica-huambo",
    short_description: "Leitura do solo, estado da cultura e plano de campanha para milho ou feijão.",
    description:
      "Uma visita de meio dia em Caála. O agrónomo observa o solo, a densidade e as pragas visíveis, e deixa um plano escrito de sementeira ou adubação. Marcação de demonstração: escolher a data no pedido, sem criar um agendamento real.",
    pricing_type: "fixed",
    price: 35000,
    location_type: "service_area",
    province_id: "demo-province-huambo",
    province_name: "Huambo",
    municipality_id: "demo-municipality-caala",
    municipality_name: "Caála",
    latitude: -12.8525,
    longitude: 15.5606,
    service_radius_km: 80,
    status: "published",
    is_featured: true,
    image_url: DEMO_MEDIA.agronomy,
  }),
  service({
    id: "demo-service-veterinaria",
    provider_id: "demo-provider-malanje",
    category_id: "demo-category-veterinary",
    category_name: "Veterinária",
    category_slug: "veterinaria",
    title: "Consulta veterinária de rebanho bovino",
    slug: "demo-consulta-veterinaria-malanje",
    short_description: "Exame do rebanho, calendário de vacinação e orientação de maneio.",
    description:
      "Visita à mangueira em Cacuso para avaliar condição corporal, parasitas e o calendário sanitário. O pedido de demonstração recolhe a data pretendida, mas não grava uma marcação.",
    pricing_type: "hourly",
    price: 25000,
    location_type: "service_area",
    province_id: "demo-province-malanje",
    province_name: "Malanje",
    municipality_id: "demo-municipality-cacuso",
    municipality_name: "Cacuso",
    latitude: -9.4167,
    longitude: 15.75,
    service_radius_km: 90,
    status: "published",
    is_featured: true,
    image_url: DEMO_MEDIA.veterinary,
  }),
  service({
    id: "demo-service-rega",
    provider_id: "demo-provider-benguela",
    category_id: "demo-category-irrigation",
    category_name: "Irrigação",
    category_slug: "irrigacao",
    title: "Montagem de um setor de rega gota-a-gota",
    slug: "demo-montagem-rega-lobito",
    short_description: "Desenho e instalação de um setor de rega para horta ou meio hectare.",
    description:
      "A equipa do Lobito marca as linhas, instala o filtro e testa a pressão. A ficha mostra o preço de instalação e o raio de deslocação. O pedido não cria uma ordem de serviço.",
    pricing_type: "fixed",
    price: 150000,
    location_type: "service_area",
    province_id: "demo-province-benguela",
    province_name: "Benguela",
    municipality_id: "demo-municipality-lobito",
    municipality_name: "Lobito",
    latitude: -12.3648,
    longitude: 13.536,
    service_radius_km: 120,
    status: "published",
    is_featured: false,
    image_url: DEMO_MEDIA.irrigation,
  }),
  service({
    id: "demo-service-transporte",
    provider_id: "demo-provider-benguela",
    category_id: "demo-category-transport",
    category_name: "Transporte",
    category_slug: "transporte",
    title: "Transporte de insumos do porto para a fazenda",
    slug: "demo-transporte-insumos-benguela",
    short_description: "Camião de 10 toneladas entre o Lobito e as fazendas da província.",
    description:
      "Recolha de sacos, adubo ou equipamento no Lobito e entrega na fazenda indicada. Origem, destino e data ficam na descrição do pedido de demonstração e não geram um transporte real.",
    pricing_type: "fixed",
    price: 85000,
    location_type: "service_area",
    province_id: "demo-province-benguela",
    province_name: "Benguela",
    municipality_id: "demo-municipality-lobito",
    municipality_name: "Lobito",
    latitude: -12.3648,
    longitude: 13.536,
    service_radius_km: 180,
    status: "published",
    is_featured: false,
    image_url: DEMO_MEDIA.transport,
  }),
  service({
    id: "demo-service-maquinas",
    provider_id: "demo-provider-benguela",
    category_id: "demo-category-machinery",
    category_name: "Maquinaria",
    category_slug: "maquinaria",
    title: "Aluguer de motocultivador com operador",
    slug: "demo-aluguer-motocultivador",
    short_description: "Preparação de solo com operador, por dia de trabalho.",
    description:
      "Um dia de lavoura ligeira com operador da oficina do Lobito. O preço de demonstração cobre a máquina e o combustível do dia. A reserva não é gravada.",
    pricing_type: "fixed",
    price: 45000,
    location_type: "service_area",
    province_id: "demo-province-benguela",
    province_name: "Benguela",
    municipality_id: "demo-municipality-lobito",
    municipality_name: "Lobito",
    latitude: -12.3648,
    longitude: 13.536,
    service_radius_km: 100,
    status: "published",
    is_featured: false,
    image_url: DEMO_MEDIA.machinery,
  }),
  service({
    id: "demo-service-assessoria",
    provider_id: "demo-provider-malanje",
    category_id: "demo-category-advisory",
    category_name: "Assessoria agrícola",
    category_slug: "assessoria-agricola",
    title: "Plano simples de campanha para a exploração",
    slug: "demo-plano-campanha-malanje",
    short_description: "Calendário de sementeira, sanidade e custos para uma campanha.",
    description:
      "Sessão de assessoria com o calendário de sementeira, o plano sanitário e uma estimativa de custos em kwanza. Serve a montra de AgriService e não abre um processo de cliente.",
    pricing_type: "fixed",
    price: 40000,
    location_type: "service_area",
    province_id: "demo-province-malanje",
    province_name: "Malanje",
    municipality_id: "demo-municipality-cacuso",
    municipality_name: "Cacuso",
    latitude: -9.4167,
    longitude: 15.75,
    service_radius_km: 90,
    status: "published",
    is_featured: true,
    image_url: DEMO_MEDIA.advisory,
  }),
];
