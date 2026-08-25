"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Package,
  CheckCircle2,
  PauseCircle,
  Archive,
  Eye,
  AlertCircle,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getMyProductStatsAction, updateProductAction } from "@/lib/services/shopping-actions";
import { UpgradePlanModal } from "@/components/ui";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { countActiveProducts } from "@/lib/services/pricing-service";
import { useI18n } from "@/i18n/provider";
import { useAgriprofileBase, useProductsWorkspaceBase } from "@/lib/agriprofile/use-workspace-base";
import type { ProductListItem } from "@/types/domain";

export function ProductsWorkspacePage() {
  const { dict } = useI18n();
  const agriprofileBase = useAgriprofileBase();
  const productsBase = useProductsWorkspaceBase();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { entitlements, loading } = useAuthoritativePlan();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    // Only load seller products if the user has entitlement
    if (!loading && entitlements.can_access_agriproduct) {
      getMyProductStatsAction()
        .then((stats) => setProducts(stats.products))
        .catch(() => setProducts([]));
    }
  }, [loading, entitlements.can_access_agriproduct]);

  const isBasic = !loading && !entitlements.can_access_agriproduct;
  const activeCount = countActiveProducts(products);
  const isLimitReached =
    entitlements.product_limit !== null && activeCount >= entitlements.product_limit;

  if (isBasic) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-surface-card rounded-3xl p-8 sm:p-12 border border-border text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full">
              Módulo Bloqueado • Plano Básico
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              AgriProduct
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A criação, edição e publicação de produtos agrícolas está disponível a partir do plano <strong>Profissional (15.000 Kz/mês)</strong> ou <strong>Business (30.000 Kz/mês)</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/planos">
              <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2 font-bold shadow-md">
                <Sparkles className="w-4 h-4" />
                <span>Ver Planos e Desbloquear</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={agriprofileBase}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-semibold">
                Voltar ao Painel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
    const matchesQuery = searchQuery
      ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesStatus && matchesQuery;
  });

  const handleStatusChange = async (productId: string, nextStatus: "published" | "paused" | "archived") => {
    setIsUpdating(productId);
    try {
      await updateProductAction({
        id: productId,
        status: nextStatus,
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: nextStatus } : p))
      );
    } catch (e) {
      console.warn("Failed to update status:", e);
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Publicado
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            Pausado
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
            <Archive className="w-3.5 h-3.5" />
            Arquivado
          </span>
        );
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            Rascunho
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            AgriProduct • Gestão de Loja
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
            Os Meus Produtos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {entitlements.product_limit !== null
              ? isLimitReached
                ? dict.products.limitTenReached
                : dict.products.activeCountOf
                    .replace("{count}", String(activeCount))
                    .replace("{limit}", String(entitlements.product_limit))
              : `${dict.products.unlimitedActive}: ${dict.products.unlimitedLabel}`}
          </p>
        </div>

        <Link href={isLimitReached ? "/planos" : `${productsBase}/new`}>
          <Button variant="primary" className="gap-2 font-bold shadow-md h-11 px-6">
            <Plus className="w-4 h-4" />
            <span>{isLimitReached ? dict.dash.upgradePlan : dict.products.add}</span>
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Total de Produtos</span>
          <p className="text-2xl font-black text-foreground mt-1">{products.length}</p>
        </div>
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Publicados</span>
          <p className="text-2xl font-black text-foreground mt-1">
            {products.filter((p) => p.status === "published" || p.status === "active").length}
          </p>
        </div>
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-amber-600 uppercase">Pausados</span>
          <p className="text-2xl font-black text-foreground mt-1">
            {products.filter((p) => p.status === "paused").length}
          </p>
        </div>
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Arquivados</span>
          <p className="text-2xl font-black text-foreground mt-1">
            {products.filter((p) => p.status === "archived").length}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-surface-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {["all", "published", "paused", "archived"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize cursor-pointer ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {st === "all" ? "Todos" : st === "published" ? "Publicados" : st === "paused" ? "Pausados" : "Arquivados"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar produtos ou SKU..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Products List Table / Cards */}
      <div className="space-y-3">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(product.status)}
                  <Badge variant="pillarShopping" className="text-[10px]">
                    {product.category_name || "AgriShopping"}
                  </Badge>
                  {product.is_featured && (
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Destaque
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-foreground truncate">{product.title}</h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 text-foreground font-black">
                    <span>{new Intl.NumberFormat("pt-AO").format(product.price)} {product.currency}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">/{product.unit}</span>
                  </div>

                  <span>• Stock: <strong>{product.quantity} {product.unit}</strong></span>

                  {product.sku && <span>• SKU: {product.sku}</span>}

                  <span>• {product.municipality_name ? `${product.municipality_name}, ` : ""}{product.province_name}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                <Link href={`${productsBase}/${product.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                    <Package className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </Button>
                </Link>

                <Link href={`/agrishopping/products/${product.slug}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </Button>
                </Link>

                {product.status === "published" || product.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating === product.id}
                    onClick={() => handleStatusChange(product.id, "paused")}
                    className="gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating === product.id}
                    onClick={() => handleStatusChange(product.id, "published")}
                    className="gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Publicar</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating === product.id}
                  onClick={() => handleStatusChange(product.id, "archived")}
                  className="gap-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Arquivar</span>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">Nenhum produto registado</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Adicione os seus produtos agropecuários para que compradores e agricultores em Angola possam contactá-lo.
            </p>
            <Link href={`${productsBase}/new`}>
              <Button variant="primary" size="sm" className="gap-1.5 font-bold mt-2">
                <Plus className="w-4 h-4" />
                <span>Adicionar Primeiro Produto</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
