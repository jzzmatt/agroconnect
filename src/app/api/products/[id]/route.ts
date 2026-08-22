import { NextResponse } from "next/server";
import { softDeleteProduct } from "@/lib/products/delete-product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const result = await softDeleteProduct(id);

  if (!result.success) {
    const status =
      result.code === "PRODUCT_NOT_FOUND"
        ? 404
        : result.code === "NOT_OWNER" || result.code === "PRODUCT_DELETE_FORBIDDEN"
          ? 403
          : result.code === "AUTH_REQUIRED"
            ? 401
            : 400;

    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
