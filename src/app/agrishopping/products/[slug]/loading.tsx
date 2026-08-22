import React from "react";

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8 animate-pulse">
        <div className="h-4 w-40 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-card rounded-3xl border border-border p-6 space-y-5">
              <div className="w-full aspect-[4/3] rounded-2xl bg-muted" />
              <div className="h-8 w-3/4 bg-muted rounded-lg" />
              <div className="h-4 w-1/2 bg-muted rounded-lg" />
              <div className="h-24 w-full bg-muted rounded-2xl" />
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="bg-surface-card rounded-3xl border border-border p-6 h-64 bg-muted/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
