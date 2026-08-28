"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  PauseCircle,
  Archive,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getOwnedProductAction,
  updateProductAction,
  updateProductInventoryAction,
  deleteProductAction,
} from "@/lib/services/shopping-actions";
import { useProductsWorkspaceBase } from "@/lib/agriprofile/use-workspace-base";
import { useI18n } from "@/i18n/provider";
import { deleteDialogForProductStatus } from "@/lib/products/delete-flow";
import { ProductDeleteDialog } from "@/components/shopping/ProductDeleteDialog";
import type { ProductListItem } from "@/types/domain";
import type { ProductAvailabilityStatus, ProductStatus } from "@/types/database";

export function ProductEditWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  const productsBase = useProductsWorkspaceBase();
  const { dict } = useI18n();

  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState("unidade");
  const [availabilityStatus, setAvailabilityStatus] =
    useState<ProductAvailabilityStatus>("in_stock");

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    getOwnedProductAction(productId)
      .then((item) => {
        if (!item) {
          setError("Produto não encontrado.");
          return;
        }
        setProduct(item);
        setTitle(item.title);
        setDescription(item.description || "");
        setPrice(item.price);
        setQuantity(item.quantity ?? 0);
        setUnit(item.unit || "unidade");
        setAvailabilityStatus(
          (item.availability_status as ProductAvailabilityStatus) || "in_stock"
        );
      })
      .catch(() => setError("Não foi possível carregar o produto."))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateProductAction({
        id: product.id,
        title: title.trim(),
        description: description.trim(),
        price,
      });
      const inventoryUpdated = await updateProductInventoryAction(product.id, {
        quantity,
        availabilityStatus,
      });
      if (!updated || !inventoryUpdated) {
        throw new Error("Falha ao guardar alterações.");
      }
      setSuccess(dict.products.publishedOk.replace("publicado", "guardado"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus: ProductStatus) => {
    if (!product) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const ok = await updateProductAction({ id: product.id, status: nextStatus });
      if (!ok) throw new Error("Não foi possível atualizar o estado.");
      setProduct({ ...product, status: nextStatus });
      setSuccess("Estado do produto atualizado.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar estado.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteProductAction(product.id);
      if (!result.success) {
        setError(result.error || dict.shopping.deleteFailed);
        return;
      }
      router.push(productsBase);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : dict.shopping.deleteFailed);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>A carregar produto...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">{error || "Produto não encontrado."}</p>
        <Link href={productsBase}>
          <Button variant="outline">Voltar aos produtos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={productsBase}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Voltar aos produtos</span>
      </Link>

      <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            AgriProduct • Editar
          </span>
          <h1 className="text-2xl font-black text-foreground mt-1">{product.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Estado atual: <strong>{product.status}</strong>
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
            {success}
          </div>
        )}

        <div className="grid gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">Título</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">Descrição</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm"
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Preço (AOA)</span>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Stock</span>
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Unidade</span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Disponibilidade</span>
              <select
                value={availabilityStatus}
                onChange={(e) =>
                  setAvailabilityStatus(e.target.value as ProductAvailabilityStatus)
                }
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm"
              >
                <option value="in_stock">Em stock</option>
                <option value="limited">Stock limitado</option>
                <option value="out_of_stock">Sem stock</option>
                <option value="pre_order">Pré-encomenda</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Button variant="primary" disabled={saving} onClick={handleSave} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Guardar alterações</span>
          </Button>

          {product.status === "published" || product.status === "active" ? (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => handleStatusChange("paused")}
              className="gap-1.5 text-amber-600"
            >
              <PauseCircle className="w-4 h-4" />
              Pausar
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => handleStatusChange("published")}
              className="gap-1.5 text-emerald-600"
            >
              <CheckCircle2 className="w-4 h-4" />
              Publicar
            </Button>
          )}

          <Button
            variant="outline"
            disabled={saving}
            onClick={() => handleStatusChange("archived")}
            className="gap-1.5"
          >
            <Archive className="w-4 h-4" />
            Arquivar
          </Button>

          <Link href={`/agrishopping/products/${product.slug}`}>
            <Button variant="outline">Ver página pública</Button>
          </Link>

          <Button
            variant="outline"
            disabled={saving}
            onClick={() => setDeleteOpen(true)}
            className="gap-1.5 text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            {dict.shopping.deleteProduct}
          </Button>
        </div>
      </div>

      <ProductDeleteDialog
        open={deleteOpen}
        kind={deleteDialogForProductStatus(product.status)}
        busy={saving}
        onClose={() => {
          if (saving) return;
          setDeleteOpen(false);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
