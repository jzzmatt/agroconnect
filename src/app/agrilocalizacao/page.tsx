import React, { Suspense } from "react";
import { AgriLocalizacaoClient } from "@/components/location/AgriLocalizacaoClient";

function AgriLocalizacaoLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-8">
        <div className="h-24 bg-muted rounded-3xl" />
        <div className="h-14 bg-muted rounded-2xl" />
        <div className="h-[520px] bg-muted rounded-3xl" />
      </div>
    </div>
  );
}

export default function AgriLocalizacaoPage() {
  return (
    <Suspense fallback={<AgriLocalizacaoLoading />}>
      <AgriLocalizacaoClient />
    </Suspense>
  );
}
