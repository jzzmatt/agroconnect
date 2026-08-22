import React from "react";
import { notFound } from "next/navigation";
import { ShoppingService } from "@/lib/services/shopping-service";
import { ProductDetailView } from "@/components/shopping/ProductDetailView";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await ShoppingService.getProductBySlug(slug);

  if (!product || product.status === "deleted") {
    notFound();
  }

  return <ProductDetailView product={product} />;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await ShoppingService.getProductBySlug(slug);
  if (!product) {
    return { title: "Produto não encontrado | AgriConnect" };
  }
  return {
    title: `${product.title} | AgriShopping`,
    description: product.description?.slice(0, 160) || product.title,
  };
}
