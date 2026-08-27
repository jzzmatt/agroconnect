import type { TransportListItem } from "@/types/transport";

export function validateTransportForPublication(
  transport: Pick<
    TransportListItem,
    "title" | "vehicle_name" | "price_per_trip" | "price_per_load" | "origin_label" | "destination_label"
  >
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!transport.title?.trim() || transport.title.trim().length < 3) {
    errors.push("O título deve ter pelo menos 3 caracteres.");
  }
  if (!transport.vehicle_name?.trim()) {
    errors.push("Indique o veículo.");
  }
  if ((transport.price_per_trip || 0) <= 0 && (transport.price_per_load || 0) <= 0) {
    errors.push("Defina pelo menos um preço (por viagem ou por carga).");
  }
  if (!transport.origin_label?.trim() && !transport.destination_label?.trim()) {
    errors.push("Indique origem e destino da rota.");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
