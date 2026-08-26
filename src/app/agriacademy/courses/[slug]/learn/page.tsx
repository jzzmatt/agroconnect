import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { CourseLearnClient } from "@/components/academy/CourseLearnClient";
import { Suspense } from "react";

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground text-center py-16">A carregar curso...</p>
          }
        >
          <CourseLearnClient slug={slug} />
        </Suspense>
      </main>
      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
