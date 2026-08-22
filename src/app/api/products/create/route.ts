import { NextResponse } from "next/server";
import { createPublishedProduct } from "@/lib/products/create-product";
import { PRODUCT_ERROR_CODES } from "@/lib/products/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthError(code?: string | null, message?: string | null) {
  return (
    code === PRODUCT_ERROR_CODES.AUTH_REQUIRED ||
    /autorizado|unauthor|sign in|iniciar sessão/i.test(message || "")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createPublishedProduct(body);
    const status = result.success
      ? 200
      : isAuthError(result.code, result.message)
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (isAuthError(null, message)) {
      return NextResponse.json(
        { success: false, code: PRODUCT_ERROR_CODES.AUTH_REQUIRED, message },
        { status: 401 }
      );
    }
    console.warn("[POST /api/products/create]", message);
    return NextResponse.json(
      { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_FAILED, message },
      { status: 500 }
    );
  }
}
