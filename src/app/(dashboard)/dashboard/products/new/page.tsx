"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { createProductAction } from "@/lib/services/shopping-actions";
import type { ProductCondition, ProductAvailabilityStatus, ProductLocationType } from "@/types/database";

export default function NewProductPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("sementes-e-fertilizantes");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<ProductCondition>("new");
  const [price, setPrice] = useState<number>(30000);
  const [unit, setUnit] = useState("saco 50kg");
  const [quantity, setQuantity] = useState<number>(50);
  const [sku, setSku] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<ProductAvailabilityStatus>("in_stock");
  const [locationType, setLocationType] = useState<ProductLocationType>("physical_location");
  const [selectedProvince, setSelectedProvince] = useState("Benguela");
  const [selectedMunicipality, setSelectedMunicipality] = useState("Lobito");
  const [sellingRadiusKm, setSellingRadiusKm] = useState<number>(70);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) {
      setError("O título do produto deve conter pelo menos 3 caracteres.");
      return;
    }
    if (price === undefined || price < 0) {
      setError("O preço do produto deve ser um valor positivo.");
      return;
    }
    if (quantity < 0) {
      setError("A quantidade de stock não pode ser negativa.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createProductAction({
        title,
        description,
        condition,
        price,
        unit,
        quantity,
        sku: sku || undefined,
        availabilityStatus,
        locationType,
        sellingRadiusKm,
        status: "published",
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/products");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Erro ao publicar produto. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para Os Meus Produtos</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          Adicionar Novo Produto
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Registe sementes, fertilizantes, equipamentos ou colheitas para comercialização no AgriShopping.
        </p>
      </div>

      {success ? (
        <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Produto Publicado com Sucesso!</h3>
          <p className="text-xs text-muted-foreground">A redirecionar para a gestão de produtos...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Basic Info */}
          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              1. Identificação do Produto
            </h3>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Nome do Produto <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Semente de Milho Híbrido ZM-521 (25kg)"
                className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Categoria Principal <span className="text-destructive">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="sementes-e-fertilizantes">Sementes & Fertilizantes</option>
                  <option value="maquinas-e-irrigacao">Máquinas & Irrigação</option>
                  <option value="produtos-agricolas">Produtos Agrícolas & Colheitas</option>
                  <option value="alimentacao-animal">Alimentação & Saúde Animal</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Condição
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="new">Novo (Insumo / Equipamento)</option>
                  <option value="used">Usado (Máquinas / Alfaias)</option>
                  <option value="not_applicable">Não Aplicável (Colheitas Frescas)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Código / SKU (Opcional)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: SEM-MIL-521"
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Descrição Técnica do Produto
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Indique especificações, variedade da cultura, taxa de germinação, dosagem ou potência..."
                className="w-full p-3 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* 2. Pricing & Stock */}
          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              2. Preço, Unidade e Stock
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Preço (Kwanza - Kz) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  min={0}
                  step={500}
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Unidade de Medida
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="unidade">unidade</option>
                  <option value="kg">kg</option>
                  <option value="saco 50kg">saco 50kg</option>
                  <option value="saco 25kg">saco 25kg</option>
                  <option value="tonelada">tonelada</option>
                  <option value="litro">litro</option>
                  <option value="conjunto">conjunto</option>
                  <option value="kit">kit</option>
                  <option value="caixa">caixa</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Quantidade em Stock
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Estado de Stock
                </label>
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="in_stock">Em Stock</option>
                  <option value="limited">Stock Limitado</option>
                  <option value="pre_order">Sob Encomenda</option>
                  <option value="out_of_stock">Sem Stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Location & Delivery Radius */}
          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              3. Localização do Armazém / Loja e Raio de Entrega
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Província</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ANGOLA_PROVINCES.map((p) => (
                    <option key={p.code} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Município</label>
                <input
                  type="text"
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Raio de Entrega (km)
                </label>
                <input
                  type="number"
                  value={sellingRadiusKm}
                  onChange={(e) => setSellingRadiusKm(Number(e.target.value))}
                  min={1}
                  max={200}
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/dashboard/products">
              <Button variant="outline" size="lg" disabled={isLoading}>
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="gap-2 font-bold px-8 shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A publicar...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publicar Produto</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
