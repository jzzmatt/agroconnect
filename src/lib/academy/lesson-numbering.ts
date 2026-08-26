export function formatChapterNumber(sortOrder: number): string {
  return String(Math.max(1, sortOrder)).padStart(2, "0");
}

export function formatLessonNumber(chapterSortOrder: number, lessonSortOrder: number): string {
  return `${formatChapterNumber(chapterSortOrder)}.${String(Math.max(1, lessonSortOrder)).padStart(2, "0")}`;
}

export function nextSortOrder(items: Array<{ sort_order: number }>): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((item) => item.sort_order)) + 1;
}

export function reorderItems<T extends { id: string; sort_order: number }>(
  items: T[],
  orderedIds: string[]
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return orderedIds
    .map((id, index) => {
      const item = byId.get(id);
      if (!item) return null;
      return { ...item, sort_order: index + 1 };
    })
    .filter((item): item is T => item !== null);
}
