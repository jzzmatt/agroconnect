import Link from "next/link";
import { getDictionary } from "@/i18n";

export const dynamic = "force-dynamic";

export default function UnavailableOrderPage() {
  const dict = getDictionary();
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
