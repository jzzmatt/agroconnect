import type { PaymentMethod } from "./database";

export interface CustomerAddress {
  id: string;
  profile_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  province_id?: string | null;
  province_name?: string | null;
  municipality_id?: string | null;
  municipality_name?: string | null;
  address_line: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CartItemDescriptor {
  id: string;
  product_id: string;
  seller_id: string;
  seller_name: string;
  seller_slug?: string;
  title: string;
  slug: string;
  unit_price: number;
  quantity: number;
  unit: string;
  subtotal: number;
  currency: string;
  image_url?: string | null;
  max_available_quantity?: number;
  is_available: boolean;
}

export interface ShoppingCart {
  id: string;
  customer_id?: string | null;
  currency: string;
  items: CartItemDescriptor[];
  items_count: number;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  sellers_count: number;
}

export interface OrderItemDescriptor {
  id: string;
  order_id: string;
  product_id: string | null;
  seller_id: string;
  product_title: string;
  product_slug?: string | null;
  sku?: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  currency: string;
}

export interface OrderSellerGroupDescriptor {
  id: string;
  order_id: string;
  seller_id: string;
  seller_name: string;
  seller_slug?: string;
  status: "pending" | "processing" | "ready_for_pickup" | "shipped" | "completed" | "cancelled";
  delivery_status: "not_assigned" | "assigned" | "accepted" | "picked_up" | "in_transit" | "delivered" | "failed" | "cancelled";
  fulfillment_method: "delivery" | "pickup";
  courier_id?: string | null;
  courier_name?: string | null;
  courier_phone?: string | null;
  courier_whatsapp?: string | null;
  delivery_otp?: string | null;
  proof_of_delivery_type?: "otp" | "photo" | "signature" | null;
  delivered_at?: string | null;
  failed_reason?: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  seller_notes?: string | null;
  items: OrderItemDescriptor[];
}

export interface DeliveryZoneDescriptor {
  id: string;
  name: string;
  description?: string | null;
  province_name?: string | null;
  municipality_name?: string | null;
  base_fee: number;
  per_km_fee: number;
  estimated_hours: number;
  is_active: boolean;
}

export interface CourierDescriptor {
  id: string;
  profile_id: string;
  company_name: string;
  vehicle_type: "motorcycle" | "pickup_truck" | "van" | "heavy_truck" | "bicycle";
  license_plate?: string | null;
  phone: string;
  whatsapp_phone?: string | null;
  status: "available" | "busy" | "offline" | "suspended";
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  rating: number;
  deliveries_count: number;
  operating_province_name?: string | null;
}

export interface OrderTrackingEventDescriptor {
  id: string;
  order_id: string;
  order_number: string;
  seller_group_id?: string | null;
  status: string;
  title: string;
  description: string;
  actor_name?: string | null;
  actor_type: "customer" | "seller" | "courier" | "logistics_admin" | "system";
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

export interface PaymentRecordDescriptor {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id?: string | null;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded";
  paid_at?: string | null;
  created_at: string;
}

export interface OrderDescriptor {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  status:
    | "pending_payment"
    | "paid"
    | "processing"
    | "ready_for_fulfillment"
    | "shipped"
    | "ready_for_pickup"
    | "completed"
    | "cancelled"
    | "failed"
    | "refunded";
  payment_status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded"
    | "partially_refunded";
  fulfillment_method: "delivery" | "pickup";
  currency: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  total: number;
  shipping_address?: CustomerAddress | null;
  notes?: string | null;
  cancelled_reason?: string | null;
  items: OrderItemDescriptor[];
  seller_groups: OrderSellerGroupDescriptor[];
  payment?: PaymentRecordDescriptor | null;
  created_at: string;
  updated_at: string;
}
