"use client";

import React, { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { SearchBar, EmptyState } from "@/components/ui";
import { LocationSelector } from "@/components/location";
import { TransportCard } from "./TransportCard";
import { searchPublishedTransportsAction } from "@/lib/transport/transport-actions";
import type { TransportListItem } from "@/types/transport";

export function TransportDiscovery() {
  const [transports, setTransports] = useState<TransportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchPublishedTransportsAction({
      query: searchQuery || undefined,
      originProvinceName: selectedProvince || undefined,
    }).then((result) => {
      if (cancelled) return;
      setTransports(result.transports);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [searchQuery, selectedProvince]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Pesquisar por rota, veículo ou prestador..."
          />
        </div>
        <div className="lg:col-span-2">
          <LocationSelector
            selectedProvince={selectedProvince}
            onProvinceChange={setSelectedProvince}
            showRadius={false}
            className="p-3"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-muted-foreground">A carregar transportes...</div>
      ) : transports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transports.map((transport) => (
            <TransportCard key={transport.id} transport={transport} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Truck}
          title="Nenhum transporte encontrado"
          description="Não encontramos transportes que correspondam aos filtros selecionados."
          actionLabel="Limpar Filtros"
          onAction={() => {
            setSearchQuery("");
            setSelectedProvince("");
          }}
        />
      )}
    </div>
  );
}
