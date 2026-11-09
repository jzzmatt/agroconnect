import { formatCoursePrice } from "@/lib/academy/course-catalog";
import { durableWhatsappLink } from "@/lib/whatsapp/product-message";

export function coursePageUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}/agriacademy/courses/${encodeURIComponent(slug)}`;
}

/** Portuguese completion note. The price is the amount the instructor saved. */
export function buildCourseCompletionMessage(input: {
  title: string;
  instructorName?: string | null;
  price: number;
  currency?: string | null;
  courseUrl: string;
}): string {
  const title = input.title.replace(/\s+/g, " ").trim() || "Curso";
  const instructor = input.instructorName?.replace(/\s+/g, " ").trim();
  const url = durableWhatsappLink(input.courseUrl) || "";
  const rows = [
    "🎓 *CURSO CONCLUÍDO NO AGROCONNECT!*",
    "",
    `📚 *${title}*`,
    "",
    "✅ *Estado:* Concluído",
    instructor ? `👨‍🏫 *Instrutor:* ${instructor}` : null,
    `💰 *Preço:* ${formatCoursePrice(input.price, input.currency || "AOA")}`,
    "",
    "🔗 Ver o curso",
    url,
    "",
    "#Agroconnect #AgriAcademy",
  ];
  return rows.filter((row) => row !== null).join("\n");
}
