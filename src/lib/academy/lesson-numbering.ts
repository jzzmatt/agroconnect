export function formatChapterNumber(sortOrder: number): string {
  return String(Math.max(1, sortOrder)).padStart(2, "0");
}

export function formatLessonNumber(chapterSortOrder: number, lessonSortOrder: number): string {
  return `${formatChapterNumber(chapterSortOrder)}.${String(Math.max(1, lessonSortOrder)).padStart(2, "0")}`;
}

/** Next 1-based position from persisted rows. Empty collections start at 1. */
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

type SortableRecord = {
  id: string;
  sort_order: number;
  created_at?: string | null;
};

/**
 * Deterministically reassign 1..n sort_order values.
 * Ties are broken by created_at then id so duplicate positions can be repaired
 * without changing identities.
 */
export function repairSortOrders<T extends SortableRecord>(items: T[]): T[] {
  return [...items]
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const createdA = a.created_at ?? "";
      const createdB = b.created_at ?? "";
      if (createdA !== createdB) return createdA.localeCompare(createdB);
      return a.id.localeCompare(b.id);
    })
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
}

export function sortOrdersAreSequential(items: Array<{ sort_order: number }>): boolean {
  const orders = [...items.map((item) => item.sort_order)].sort((a, b) => a - b);
  return orders.every((order, index) => order === index + 1);
}
