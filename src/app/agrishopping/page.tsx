"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, EmptyState } from "@/components/ui";
import { LocationMap, type MapMarkerItem } from "@/components/location";
import { ShoppingProductCard, ShoppingProductFilters } from "@/components/shopping";
import { ShoppingService, INITIAL_PRODUCTS } from "@/lib/services/shopping-service";
import { toggleProductFavoriteAction } from "@/lib/services/shopping-actions";
import type { ProductListItem } from "@/types/domain";
import type { ProductAvailabilityStatus } from "@/types/database";
import { Package, SlidersHorizontal, Map as MapIcon, List } from "lucide-react";
import { useGeolocation } from "@/lib/location/use-geolocation";
import { useI18n } from "@/i18n/provider";

export default function AgriShoppingPage() {
  const { dict } = useI18n();
  const [products, setProducts] = useState<ProductListItem[]>(INITIAL_PRODUCTS);
  const [totalCount, setTotalCount] = useState<number>(INITIAL_PRODUCTS.length);
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [selectedAvailability, setSelectedAvailability] = useState<ProductAvailabilityStatus | "">("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"split" | "list" | "map">("split");

  const [isPending, startTransition] = useTransition();
  const { coordinates: userCoords } = useGeolocation();
  const userLatitude = userCoords?.latitude ?? null;
  const userLongitude = userCoords?.longitude ?? null;

  const loadProducts = useCallback(async () => {
    const res = await ShoppingService.searchProducts({
      query: searchQuery,
      categorySlug: selectedCategory || undefined,
      provinceName: selectedProvince || undefined,
      municipalityName: selectedMunicipality || undefined,
      availabilityStatus: (selectedAvailability as ProductAvailabilityStatus) || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      latitude: userLatitude ?? undefined,
      longitude: userLongitude ?? undefined,
      radiusKm: selectedRadius,
      sortBy: sortBy as any,
    });

    setProducts(res.products);
    setTotalCount(res.total);
  }, [
    searchQuery,
    selectedCategory,
    selectedProvince,
    selectedMunicipality,
    selectedAvailability,
    minPrice,
    maxPrice,
    selectedRadius,
    sortBy,
    userLatitude,
    userLongitude,
  ]);

  useEffect(() => {
    startTransition(() => {
      loadProducts();
    });
  }, [loadProducts]);

  const handleToggleFavorite = async (productId: string) => {
    try {
      const res = await toggleProductFavoriteAction(productId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (res.isFavorited) next.add(productId);
        else next.delete(productId);
        return next;
      });
    } catch {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) next.delete(productId);
        else next.add(productId);
        return next;
      });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedProvince("");
    setSelectedMunicipality("");
    setSelectedAvailability("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("relevance");
  };

  const handleSelectMarker = useCallback(
    (marker: MapMarkerItem | null) => {
      if (!marker) {
        setSelectedProduct(null);
        return;
      }
      setSelectedProduct((current) => {
        if (current?.id === marker.id) return current;
        return products.find((p) => p.id === marker.id) || null;
      });
    },
    [products]
  );

  const mapMarkers: MapMarkerItem[] = products
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: "shopping" as const,
      latitude: p.latitude!,
      longitude: p.longitude!,
      provinceName: p.province_name || "Angola",
      municipalityName: p.municipality_name || undefined,
      description: `${p.price} ${p.currency} / ${p.unit}`,
    }));

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <SectionHeader
              badgeText="AgriShopping"
              title={dict.pillars.agriShopping.headline}
              subtitle={dict.pillars.agriShopping.description}
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border shrink-0 self-start md:self-auto">
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "split"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dividido</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "map"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Mapa</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <ShoppingProductFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedProvince={selectedProvince}
          onProvinceChange={setSelectedProvince}
          selectedMunicipality={selectedMunicipality}
          onMunicipalityChange={setSelectedMunicipality}
          selectedRadius={selectedRadius}
          onRadiusChange={setSelectedRadius}
          selectedAvailability={selectedAvailability}
          onAvailabilityChange={setSelectedAvailability}
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onClearFilters={handleClearFilters}
          totalResults={totalCount}
        />

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Products Grid */}
          {(viewMode === "split" || viewMode === "list") && (
            <div
              className={`space-y-4 ${
                viewMode === "split" ? "lg:col-span-7" : "lg:col-span-12"
              }`}
            >
              {products.length > 0 ? (
                <div
                  className={`grid gap-4 ${
                    viewMode === "list"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2"
                  }`}
                >
                  {products.map((product) => (
                    <ShoppingProductCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProduct?.id === product.id}
                      isFavorited={favorites.has(product.id)}
                      onSelect={(p) => setSelectedProduct(p)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Package}
                  title={dict.shopping.noResults}
                  description={dict.shopping.searchPlaceholder}
                  actionLabel={dict.common.clear}
                  onAction={handleClearFilters}
                />
              )}
            </div>
          )}

          {/* Interactive MapQuest Map */}
          {(viewMode === "split" || viewMode === "map") && (
            <div
              className={`sticky top-20 ${
                viewMode === "split" ? "lg:col-span-5" : "lg:col-span-12"
              }`}
            >
              <div className="bg-surface-card rounded-3xl p-2 border border-border shadow-md">
                <LocationMap
                  markers={mapMarkers}
                  height={viewMode === "map" ? "h-[640px]" : "h-[540px]"}
                  selectedMarkerId={selectedProduct?.id}
                  onSelectMarker={handleSelectMarker}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
