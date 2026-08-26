import { CourseEditor } from "@/components/academy/CourseEditor";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs font-bold text-primary uppercase tracking-wider">AgriAcademy</span>
        <h1 className="text-2xl font-black mt-1">Editor de curso</h1>
      </div>
      <CourseEditor courseId={courseId} />
    </div>
  );
}
