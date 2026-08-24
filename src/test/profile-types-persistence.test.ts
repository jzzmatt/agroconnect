import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ProfileType, UserRoleType } from "@/types/database";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const PROFILE_ACTIONS = "src/lib/auth/profile-actions.ts";
const EDIT_PAGE = "src/app/(dashboard)/profile/edit/page.tsx";
const PROFILE_PAGE = "src/app/(dashboard)/profile/page.tsx";
const DASHBOARD_LAYOUT = "src/components/dashboard/DashboardShell.tsx";

describe("profile types are persisted to the database", () => {
  it("exposes a server action that writes the selection", () => {
    const src = read(PROFILE_ACTIONS);
    expect(src).toMatch("export async function updateProfileTypesAction");
    expect(src).toMatch("user_roles");
  });

  it("is called when the edit form is saved", () => {
    const src = read(EDIT_PAGE);
    expect(src).toMatch("updateProfileTypesAction(selectedProfileTypes)");
  });

  it("no longer shadows the selection in localStorage", () => {
    // The selection used to be written to localStorage and read back, which is
    // what made it look saved while never reaching the database.
    const editSrc = read(EDIT_PAGE);
    const localStorageWrite = editSrc.slice(editSrc.indexOf("localStorage.setItem"));
    expect(localStorageWrite).not.toMatch(/selectedProfileTypes,/);
    expect(editSrc).not.toMatch("setSelectedProfileTypes(parsed.selectedProfileTypes)");
  });

  it("does not restore roles from localStorage anywhere", () => {
    for (const file of [PROFILE_PAGE, DASHBOARD_LAYOUT]) {
      expect(read(file), `${file} must not read roles from localStorage`).not.toMatch(
        /parsed\.selectedProfileTypes/
      );
    }
  });
});

describe("persistence failures are reported rather than swallowed", () => {
  it("switchActiveProfileTypeAction no longer returns success unconditionally", () => {
    const src = read(PROFILE_ACTIONS);
    const action = src.slice(
      src.indexOf("export async function switchActiveProfileTypeAction"),
      src.indexOf("ROLE_BACKED_PROFILE_TYPES")
    );
    // The old bug: the catch block returned success: true, hiding a failed write.
    expect(action).toMatch("success: false");
    expect(action).toMatch(/catch[\s\S]*success: false/);
  });

  it("prefers the admin client so an RLS-scoped update cannot silently match zero rows", () => {
    const src = read(PROFILE_ACTIONS);
    expect(src).toMatch("tryCreateAdminServerSupabaseClient");
  });

  it("surfaces a save error in the edit form instead of always showing success", () => {
    const src = read(EDIT_PAGE);
    expect(src).toMatch("saveError");
    expect(src).toMatch("setSaveError");
  });

  it("reverts an active-profile switch that did not persist", () => {
    const src = read(DASHBOARD_LAYOUT);
    expect(src).toMatch("if (!result.success)");
    expect(src).toMatch("setActiveProfile(previous)");
  });
});

describe("views refresh after a profile is saved", () => {
  const EVENTS = "src/lib/auth/profile-events.ts";

  it("broadcasts a profile change event", () => {
    const src = read(EVENTS);
    expect(src).toMatch("PROFILE_CHANGED_EVENT");
    expect(src).toMatch("export function notifyProfileChanged");
    expect(src).toMatch("export function useProfileChangeListener");
  });

  it("notifies after a successful save, not before", () => {
    const src = read(EDIT_PAGE);
    expect(src).toMatch("notifyProfileChanged()");
    // The notification must come after the types call, so listeners refetch
    // state that already includes the new selection.
    expect(src.indexOf("updateProfileTypesAction(selectedProfileTypes)")).toBeLessThan(
      src.indexOf("notifyProfileChanged()")
    );
  });

  it("notifies after switching the active profile", () => {
    const src = read(DASHBOARD_LAYOUT);
    expect(src).toMatch("notifyProfileChanged()");
  });

  it("subscribes both cards and the layout to the event", () => {
    for (const file of [DASHBOARD_LAYOUT, PROFILE_PAGE, "src/app/(dashboard)/dashboard/page.tsx"]) {
      const src = read(file);
      expect(src, `${file} must listen for profile changes`).toMatch(
        "useProfileChangeListener(loadServerProfile)"
      );
      expect(src, `${file} must expose a stable reload callback`).toMatch(
        "const loadServerProfile = useCallback"
      );
    }
  });

  it("replaces the areas-of-activity list rather than merging it", () => {
    // Merging would leave a removed area on the card after a save.
    const src = read(PROFILE_PAGE);
    expect(src).toMatch(/serverProfile\.roles && serverProfile\.roles\.length > 0/);
  });

  it("listens for visibilitychange on document, where it actually fires", () => {
    for (const file of [EVENTS, "src/lib/subscription/use-authoritative-plan.ts"]) {
      const src = read(file);
      expect(src, `${file} must not listen for visibilitychange on window`).not.toMatch(
        /window\.(add|remove)EventListener\("visibilitychange"/
      );
      expect(src).toMatch(/document\.addEventListener\("visibilitychange"/);
    }
  });
});

describe("profile type to role mapping", () => {
  /**
   * Every profile type offered by the edit form must be a valid user role,
   * otherwise saving it would violate the user_roles check constraint.
   */
  const offeredInEditForm: ProfileType[] = [
    "veterinarian",
    "expert",
    "instructor",
    "student",
    "seller",
    "farmer",
    "service_provider",
  ];

  const validRoles: UserRoleType[] = [
    "student",
    "creator",
    "seller",
    "instructor",
    "expert",
    "veterinarian",
    "agronomist",
    "agricultural_consultant",
    "business",
    "farmer",
    "service_provider",
    "admin",
  ];

  it("maps every selectable profile type onto a real role", () => {
    for (const type of offeredInEditForm) {
      expect(validRoles).toContain(type as UserRoleType);
    }
  });

  it("keeps the role-backed list free of the implicit 'personal' type", () => {
    const src = read(PROFILE_ACTIONS);
    const list = src.slice(
      src.indexOf("const ROLE_BACKED_PROFILE_TYPES"),
      src.indexOf("type RoleBackedProfileType")
    );
    expect(list).not.toMatch(/"personal"/);
    for (const type of offeredInEditForm) {
      expect(list).toMatch(`"${type}"`);
    }
  });

  it("re-points the active profile when it is no longer held", () => {
    const src = read(PROFILE_ACTIONS);
    expect(src).toMatch("active_profile_type: desired[0]");
  });
});
