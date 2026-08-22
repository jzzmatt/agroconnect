"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  KeyRound,
  ShieldAlert,
  UserCheck,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CourierDeliveryCard } from "@/components/logistics/CourierDeliveryCard";
import { OTPVerificationModal } from "@/components/logistics/OTPVerificationModal";
import {
  getSellerOrdersAction,
  updateFulfillmentStatusAction,
} from "@/lib/services/commerce-actions";
import {
  getCouriersAction,
  getDeliveryZonesAction,
  assignCourierAction,
  updateCourierDeliveryStatusAction,
} from "@/lib/services/logistics-actions";
import type {
  OrderDescriptor,
  CourierDescriptor,
  DeliveryZoneDescriptor,
} from "@/types/domain";

export default function LogisticsDashboardPage() {
  const [orders, setOrders] = useState<OrderDescriptor[]>([]);
  const [couriers, setCouriers] = useState<CourierDescriptor[]>([]);
  const [zones, setZones] = useState<DeliveryZoneDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"deliveries" | "zones" | "couriers">("deliveries");

  // OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState("");

  const loadData = async () => {
    const [ordersData, couriersData, zonesData] = await Promise.all([
      getSellerOrdersAction(),
      getCouriersAction(),
      getDeliveryZonesAction(),
    ]);
    setOrders(ordersData);
    setCouriers(couriersData);
    setZones(zonesData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenOTP = (orderNumber: string, sellerId: string) => {
    setSelectedOrderNumber(orderNumber);
    setSelectedSellerId(sellerId);
    setOtpModalOpen(true);
  };

  const handleUpdateStatus = async (
    orderNumber: string,
    sellerId: string,
    nextDeliveryStatus: any
  ) => {
    await updateCourierDeliveryStatusAction({
      orderNumber,
      sellerId,
      courierId: couriers[0]?.id || "cour-1",
      nextDeliveryStatus,
    });
    await loadData();
  };

  const handleAssignCourier = async (
    orderNumber: string,
    sellerId: string,
    courierId: string
  ) => {
    await assignCourierAction({ orderNumber, sellerId, courierId });
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              AgriConnect • Gestão de Logística & Transportes
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
              Centro de Expedição & Entregas
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Coordenação de rotas, transportadores autorizados, zonas de entrega e confirmação OTP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Rede de Distribuição Ativa</span>
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setActiveTab("deliveries")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "deliveries"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface text-foreground hover:bg-muted"
            }`}
          >
            Entregas em Curso ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("zones")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "zones"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface text-foreground hover:bg-muted"
            }`}
          >
            Zonas de Entrega & Tarifas ({zones.length})
          </button>
          <button
            onClick={() => setActiveTab("couriers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "couriers"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface text-foreground hover:bg-muted"
            }`}
          >
            Transportadores Cadastrados ({couriers.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-muted-foreground">
          A carregar operações de logística...
        </div>
      ) : activeTab === "deliveries" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((ord) => (
              <CourierDeliveryCard
                key={ord.id}
                order={ord}
                courierId={couriers[0]?.id || "cour-1"}
                onOpenOTPModal={handleOpenOTP}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        </div>
      ) : activeTab === "zones" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((z) => (
            <div
              key={z.id}
              className="bg-surface-card p-6 rounded-3xl border border-border shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{z.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase">
                  {z.estimated_hours}h estimadas
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{z.description}</p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tarifa Base:</span>
                <span className="font-bold text-foreground">
                  {new Intl.NumberFormat("pt-AO").format(z.base_fee)} AOA
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Adicional por KM:</span>
                <span className="font-bold text-primary">
                  {new Intl.NumberFormat("pt-AO").format(z.per_km_fee)} AOA / km
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {couriers.map((c) => (
            <div
              key={c.id}
              className="bg-surface-card p-6 rounded-3xl border border-border shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{c.company_name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-[10px] font-bold">
                  {c.verification_status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Veículo: <strong className="text-foreground capitalize">{c.vehicle_type}</strong> • Placa: {c.license_plate}
              </p>
              <p className="text-xs text-muted-foreground">
                Tel: <strong className="text-foreground">{c.phone}</strong>
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Classificação:</span>
                <span className="font-bold text-amber-600">★ {c.rating} ({c.deliveries_count} entregas)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OTP Modal */}
      <OTPVerificationModal
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        orderNumber={selectedOrderNumber}
        sellerId={selectedSellerId}
        courierId={couriers[0]?.id || "cour-1"}
        onVerifySuccess={loadData}
      />
    </div>
  );
}
