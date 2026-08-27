"use client";

import Link from "next/link";
import { Truck } from "lucide-react";
import { TransportCard } from "@/components/transport";
import type { TransportListItem } from "@/types/transport";

export function ProviderTransportSection({
  transports,
  providerName,
}: {
  transports: TransportListItem[];
  providerName: string;
}) {
  if (transports.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          Transportes Publicados ({transports.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          Rotas e veículos disponíveis por {providerName}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {transports.map((transport) => (
          <TransportCard key={transport.id} transport={transport} />
        ))}
      </div>
      <Link href="/agriservice?view=transporte" className="text-xs font-bold text-primary">
        Ver todos os transportes →
      </Link>
    </div>
  );
}
