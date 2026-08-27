import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { CourseDetailClient } from "@/components/academy/CourseDetailClient";
import { AcademyLoadingFallback } from "@/components/academy/AcademyLoadingFallback";
import { Suspense } from "react";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <Suspense fallback={<AcademyLoadingFallback />}>
          <CourseDetailClient slug={slug} />
        </Suspense>
      </main>
      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
