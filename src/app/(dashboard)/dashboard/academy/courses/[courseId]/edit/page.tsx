import { CourseEditor } from "@/components/academy/CourseEditor";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseEditor courseId={courseId} />;
}
