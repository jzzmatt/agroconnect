import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk/auth";
import { getOrCreateCurrentProviderProfileAction } from "@/lib/services/marketplace-actions";
import { ShoppingService } from "@/lib/services/shopping-service";
import { getUserEntitlementsForUser } from "@/lib/auth/user-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: productId } = await params;

    const entitlements = await getUserEntitlementsForUser();
    if (!entitlements?.can_edit_products) {
      return NextResponse.json(
        { success: false, code: "NOT_AUTHORIZED" },
        { status: 403 }
      );
    }

    const seller = await getOrCreateCurrentProviderProfileAction();
    const result = await ShoppingService.deleteProduct(productId, seller.id);

    if (!result.success) {
      const status =
        result.code === "PRODUCT_NOT_FOUND"
          ? 404
          : result.code === "NOT_OWNER"
            ? 403
            : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, code: "NOT_AUTHORIZED" },
      { status: 401 }
    );
  }
}
