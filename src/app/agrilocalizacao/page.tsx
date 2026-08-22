import React, { Suspense } from "react";
import { AgriLocalizacaoClient } from "./AgriLocalizacaoClient";

export default function AgriLocalizacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          A carregar mapa...
        </div>
      }
    >
      <AgriLocalizacaoClient />
    </Suspense>
  );
}
