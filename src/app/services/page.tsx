import { redirect } from "next/navigation";

export default function ServicesRedirectPage() {
  redirect("/agriservice?view=servicos");
}
