import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk/auth";
import { getOrCreateCurrentProviderProfileAction } from "@/lib/services/marketplace-actions";
import { ShoppingService } from "@/lib/services/shopping-service";
import { countActiveProducts } from "@/lib/services/pricing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();
    const seller = await getOrCreateCurrentProviderProfileAction();
    const products = await ShoppingService.getSellerProducts(seller.id, false);
    const ownProducts = products.filter((product) => product.seller_id === seller.id);
    return NextResponse.json({
      success: true,
      products: ownProducts,
      activeCount: countActiveProducts(ownProducts),
    });
  } catch {
    return NextResponse.json({
      success: true,
      products: [],
      activeCount: 0,
    });
  }
}
