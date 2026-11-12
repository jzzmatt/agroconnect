export function adminUserIds(): string[] {
  return (process.env.AGROCONNECT_ADMIN_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function isAllowlistedAdmin(clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false;
  return adminUserIds().includes(clerkUserId);
}

export function sanitizeUserSearch(raw: string): string {
  return raw.replace(/[%(),*\\]/g, "").trim().slice(0, 80);
}
