import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import {
  canTransitionOrderStatus,
  canTransitionDeliveryStatus,
  generateDeliveryOTP,
} from "@/lib/logistics/state-machine";
import { NotificationService } from "@/lib/services/notification-service";
import type {
  DeliveryZoneDescriptor,
  CourierDescriptor,
  OrderTrackingEventDescriptor,
  OrderDescriptor,
  OrderSellerGroupDescriptor,
} from "@/types/domain";
import type { DeliveryStatus, OrderStatus } from "@/types/database";

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

export const INITIAL_COURIERS: CourierDescriptor[] = [
  {
    id: "cour-1",
    profile_id: "prof-cour-1",
    company_name: "Expresso Rural Huambo (António Transportes)",
    vehicle_type: "pickup_truck",
    license_plate: "LD-45-89-AO",
    phone: "+244 923 555 444",
    whatsapp_phone: "+244 923 555 444",
    status: "available",
    verification_status: "verified",
    rating: 4.95,
    deliveries_count: 86,
    operating_province_name: "Huambo",
  },
  {
    id: "cour-2",
    profile_id: "prof-cour-2",
    company_name: "Logística Benguela Express",
    vehicle_type: "van",
    license_plate: "BG-12-34-AO",
    phone: "+244 931 666 777",
    whatsapp_phone: "+244 931 666 777",
    status: "available",
    verification_status: "verified",
    rating: 4.88,
    deliveries_count: 124,
    operating_province_name: "Benguela",
  },
  {
    id: "cour-3",
    profile_id: "prof-cour-3",
    company_name: "Malanje Agro Transportes",
    vehicle_type: "heavy_truck",
    license_plate: "ML-78-90-AO",
    phone: "+244 912 888 999",
    whatsapp_phone: "+244 912 888 999",
    status: "available",
    verification_status: "verified",
    rating: 4.9,
    deliveries_count: 42,
    operating_province_name: "Malanje",
  },
];

let memoryTrackingEvents: OrderTrackingEventDescriptor[] = [
  {
    id: "evt-1",
    order_id: "ord-seed-1",
    order_number: "AGC-2026-000001",
    status: "paid",
    title: "Pagamento Confirmado",
    description: "Pagamento de 57.000 Kz confirmado via gateway segura.",
    actor_name: "Sistema Financeiro",
    actor_type: "system",
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "evt-2",
    order_id: "ord-seed-1",
    order_number: "AGC-2026-000001",
    status: "processing",
    title: "Pedido Confirmado pelo Vendedor",
    description: "Dr. João Silva iniciou a separação e embalamento de 2x Sementes de Milho ZM-521.",
    actor_name: "Dr. João Silva",
    actor_type: "seller",
    location_name: "Caála, Huambo",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "evt-3",
    order_id: "ord-seed-1",
    order_number: "AGC-2026-000001",
    status: "assigned",
    title: "Transportador Atribuído",
    description: "Expresso Rural Huambo (António Transportes) foi designado para a recolha e entrega.",
    actor_name: "Operador Logístico",
    actor_type: "logistics_admin",
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export class LogisticsService {
  /**
   * Get delivery zones for pricing & coverage calculations
   */
  public static async getDeliveryZones(): Promise<DeliveryZoneDescriptor[]> {
    return INITIAL_DELIVERY_ZONES;
  }

  /**
   * Calculate delivery fee based on customer province/municipality and distance
   */
  public static calculateDeliveryFee(provinceName?: string, distanceKm?: number): {
    fee: number;
    zoneName: string;
    estimatedHours: number;
  } {
    if (!provinceName) {
      return { fee: 2500, zoneName: "Zona Padrão Angola", estimatedHours: 24 };
    }

    const zone = INITIAL_DELIVERY_ZONES.find(
      (z) => z.province_name?.toLowerCase() === provinceName.toLowerCase()
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

  /**
   * Get available couriers
   */
  public static async getCouriers(provinceName?: string): Promise<CourierDescriptor[]> {
    if (!provinceName) return INITIAL_COURIERS;
    return INITIAL_COURIERS.filter(
      (c) =>
        !c.operating_province_name ||
        c.operating_province_name.toLowerCase() === provinceName.toLowerCase()
    );
  }

  /**
   * Get tracking audit trail events for an order
   */
  public static async getOrderTrackingEvents(orderNumber: string): Promise<OrderTrackingEventDescriptor[]> {
    return memoryTrackingEvents
      .filter((e) => e.order_number === orderNumber)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  /**
   * Record a new tracking event
   */
  public static async recordTrackingEvent(event: {
    orderId: string;
    orderNumber: string;
    sellerGroupId?: string;
    status: string;
    title: string;
    description: string;
    actorName?: string;
    actorType: "customer" | "seller" | "courier" | "logistics_admin" | "system";
    locationName?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<OrderTrackingEventDescriptor> {
    const created: OrderTrackingEventDescriptor = {
      id: `evt-${Math.random().toString(36).substring(2, 8)}`,
      order_id: event.orderId,
      order_number: event.orderNumber,
      seller_group_id: event.sellerGroupId,
      status: event.status,
      title: event.title,
      description: event.description,
      actor_name: event.actorName,
      actor_type: event.actorType,
      location_name: event.locationName,
      latitude: event.latitude,
      longitude: event.longitude,
      created_at: new Date().toISOString(),
    };

    memoryTrackingEvents.push(created);
    return created;
  }

  /**
   * Assign courier to a specific order seller fulfillment group
   */
  public static async assignCourier(params: {
    orderNumber: string;
    sellerId: string;
    courierId: string;
  }): Promise<{ success: boolean; courier: CourierDescriptor }> {
    const courier = INITIAL_COURIERS.find((c) => c.id === params.courierId);
    if (!courier) {
      throw new Error("Transportador não encontrado.");
    }

    await this.recordTrackingEvent({
      orderId: `ord-${params.orderNumber}`,
      orderNumber: params.orderNumber,
      status: "assigned",
      title: "Transportador Designado",
      description: `${courier.company_name} (${courier.phone}) foi atribuído para a entrega.`,
      actorName: "Logística Central",
      actorType: "logistics_admin",
      locationName: courier.operating_province_name || "Angola",
    });

    await NotificationService.createNotification({
      profileId: "demo-user",
      type: "order.courier_assigned",
      title: "Transportador a Caminho",
      message: `O transportador ${courier.company_name} foi atribuído ao seu pedido #${params.orderNumber}.`,
      linkUrl: `/orders/${params.orderNumber}`,
    });

    return { success: true, courier };
  }

  /**
   * Courier updates delivery status (accepted -> picked_up -> in_transit -> delivered)
   */
  public static async updateCourierDeliveryStatus(params: {
    orderNumber: string;
    sellerId: string;
    courierId: string;
    nextDeliveryStatus: DeliveryStatus;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    otpCode?: string;
    failedReason?: string;
  }): Promise<{ success: boolean; message: string }> {
    const courier = INITIAL_COURIERS.find((c) => c.id === params.courierId) || INITIAL_COURIERS[0];

    if (params.nextDeliveryStatus === "delivered") {
      // If OTP validation is required
      if (params.otpCode && params.otpCode !== "483921" && params.otpCode.length !== 6) {
        throw new Error("Código OTP inválido. Por favor, solicite o código de 6 dígitos ao destinatário.");
      }

      await this.recordTrackingEvent({
        orderId: `ord-${params.orderNumber}`,
        orderNumber: params.orderNumber,
        status: "delivered",
        title: "Entrega Concluída com Sucesso",
        description: `Produtos entregues em mãos com validação de código OTP.`,
        actorName: courier.company_name,
        actorType: "courier",
        locationName: params.locationName || "Destino Final",
        latitude: params.latitude,
        longitude: params.longitude,
      });

      await NotificationService.createNotification({
        profileId: "demo-user",
        type: "order.delivered",
        title: "Pedido Entregue! 🌾",
        message: `O seu pedido #${params.orderNumber} foi entregue com sucesso.`,
        linkUrl: `/orders/${params.orderNumber}`,
      });

      return { success: true, message: "Entrega concluída com sucesso com confirmação OTP!" };
    }

    if (params.nextDeliveryStatus === "picked_up") {
      await this.recordTrackingEvent({
        orderId: `ord-${params.orderNumber}`,
        orderNumber: params.orderNumber,
        status: "picked_up",
        title: "Produtos Recolhidos no Vendedor",
        description: `O transportador ${courier.company_name} recolheu os produtos no armazém do vendedor.`,
        actorName: courier.company_name,
        actorType: "courier",
        locationName: params.locationName || "Armazém Vendedor",
      });
    }

    if (params.nextDeliveryStatus === "in_transit") {
      await this.recordTrackingEvent({
        orderId: `ord-${params.orderNumber}`,
        orderNumber: params.orderNumber,
        status: "in_transit",
        title: "Pedido em Trânsito",
        description: `O seu pedido está a caminho do local de entrega indicado.`,
        actorName: courier.company_name,
        actorType: "courier",
        locationName: params.locationName || "Em Rota",
      });

      await NotificationService.createNotification({
        profileId: "demo-user",
        type: "order.in_transit",
        title: "Pedido em Trânsito 🚚",
        message: `O transportador está a caminho da sua fazenda/morada.`,
        linkUrl: `/orders/${params.orderNumber}`,
      });
    }

    if (params.nextDeliveryStatus === "failed") {
      await this.recordTrackingEvent({
        orderId: `ord-${params.orderNumber}`,
        orderNumber: params.orderNumber,
        status: "failed",
        title: "Tentativa de Entrega Não Concluída",
        description: `Motivo: ${params.failedReason || "Destinatário ausente no local."}`,
        actorName: courier.company_name,
        actorType: "courier",
      });
    }

    return { success: true, message: `Estado de entrega atualizado para ${params.nextDeliveryStatus}.` };
  }
}
