import type { DeliveryZoneDescriptor } from "@/types/commerce";

export const INITIAL_DELIVERY_ZONES: DeliveryZoneDescriptor[] = [
  {
    id: "zone-hua",
    name: "Zona Huambo Central (Caála & Huambo)",
    description: "Entrega rápida no Planalto Central de Angola",
    province_name: "Huambo",
    municipality_name: "Caála",
    base_fee: 2000,
    per_km_fee: 100,
    estimated_hours: 12,
    is_active: true,
  },
  {
    id: "zone-bgu",
    name: "Zona Litoral Benguela (Lobito & Catumbela)",
    description: "Entrega expressa litoral de Benguela",
    province_name: "Benguela",
    municipality_name: "Lobito",
    base_fee: 2500,
    per_km_fee: 120,
    estimated_hours: 18,
    is_active: true,
  },
  {
    id: "zone-mal",
    name: "Zona Malanje Agrícola (Cacuso & Malanje)",
    description: "Rotas rurais e entregas em fazendas",
    province_name: "Malanje",
    municipality_name: "Cacuso",
    base_fee: 3000,
    per_km_fee: 150,
    estimated_hours: 24,
    is_active: true,
  },
  {
    id: "zone-lua",
    name: "Zona Luanda Metropolitana & Cintura Verde",
    description: "Distribuição na capital e cinturão hortícola de Viana/Cacuaco",
    province_name: "Luanda",
    municipality_name: "Viana",
    base_fee: 3500,
    per_km_fee: 200,
    estimated_hours: 24,
    is_active: true,
  },
];

export function calculateDeliveryFee(
  provinceName?: string,
  distanceKm?: number
): {
  fee: number;
  zoneName: string;
  estimatedHours: number;
} {
  if (!provinceName) {
    return { fee: 2500, zoneName: "Zona Padrão Angola", estimatedHours: 24 };
  }

  const zone = INITIAL_DELIVERY_ZONES.find(
    (entry) => entry.province_name?.toLowerCase() === provinceName.toLowerCase()
  );

  if (zone) {
    const distanceExtra = distanceKm ? Math.max(0, distanceKm - 10) * zone.per_km_fee : 0;
    return {
      fee: Math.round(zone.base_fee + distanceExtra),
      zoneName: zone.name,
      estimatedHours: zone.estimated_hours,
    };
  }

  return { fee: 2500, zoneName: "Zona Geral Angola", estimatedHours: 24 };
}
