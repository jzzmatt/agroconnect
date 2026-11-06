import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { CommerceService } from "@/lib/services/commerce-service";
import { isUuid } from "@/lib/products/ids";
import { getDictionary } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function WhatsappOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { productId } = await params;
  const query = await searchParams;
  const source = query.source || "whatsapp";
  const destination = `/order/${productId}?source=${encodeURIComponent(source)}`;
  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(destination)}`);
  }

  const dict = getDictionary();
  if (!isUuid(productId)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-black">{dict.whatsapp.orderUnavailable}</h1>
        <Link href="/agrishopping" className="text-sm font-bold text-primary">
          {dict.whatsapp.orderBrowse}
        </Link>
      </main>
    );
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(destination)}`);
  }

  try {
    await CommerceService.addToCart(
      { productId, quantity: 1, once: true },
      { customerId: profile.id, persist: true }
    );
  } catch {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-black">{dict.whatsapp.orderUnavailable}</h1>
        <p className="text-sm text-muted-foreground">{dict.whatsapp.orderUnavailableBody}</p>
        <Link href="/agrishopping" className="text-sm font-bold text-primary">
          {dict.whatsapp.orderBrowse}
        </Link>
      </main>
    );
  }

  redirect("/cart");
}
