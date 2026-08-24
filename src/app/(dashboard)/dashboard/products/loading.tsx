import React from "react";

export default function ProductsDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-surface-card rounded-3xl border border-border p-8 h-32" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-card rounded-2xl border border-border h-20" />
        ))}
      </div>
      <div className="bg-surface-card rounded-2xl border border-border h-14" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-surface-card rounded-2xl border border-border h-24" />
      ))}
    </div>
  );
}
