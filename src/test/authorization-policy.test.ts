import { describe, it, expect, afterEach } from "vitest";
import {
  AuthorizationError,
  PERMISSIONS,
  PERMISSION_POLICY,
  can,
  decide,
  grantedPermissions,
  isOwner,
  isPermission,
  requireEntitlement,
  requireOwnership,
  requirePermission,
  requirePlanActivationAllowed,
  subjectFromProfile,
  type CapabilitySubject,
  type Permission,
} from "@/lib/authorization";
import type { AccountType, SubscriptionPlan, UserRoleType } from "@/types/database";

function subject(options: {
  plan?: SubscriptionPlan;
  roles?: UserRoleType[];
  accountType?: AccountType;
  profileId?: string;
  subscriptionStatus?: string;
  activeProductCount?: number;
} = {}): CapabilitySubject {
  return subjectFromProfile(
    {
      id: options.profileId ?? "profile-owner",
      clerk_user_id: "clerk-1",
      roles: options.roles ?? ["student"],
      account_type: options.accountType ?? "customer",
      subscription_plan: options.plan ?? "basic",
      subscription_status: options.subscriptionStatus ?? "active",
    },
    { activeProductCount: options.activeProductCount }
  );
}

const FREE = () => subject({ plan: "basic" });
const PAID = () => subject({ plan: "professional" });

/**
 * The eight authorization cases required by .cursor/rules/08-testing.mdc.
 * Each has at least one explicit assertion.
 */
describe("authorization matrix: the eight required cases", () => {
  it("1. unauthenticated is denied and reports AUTH_REQUIRED", () => {
    expect(can(null, "product.view")).toBe(false);
    expect(decide(null, "product.view").code).toBe("AUTH_REQUIRED");
    expect(() => requirePermission(null, "product.create")).toThrow(AuthorizationError);
    try {
      requirePermission(null, "product.create");
    } catch (error) {
      expect((error as AuthorizationError).code).toBe("AUTH_REQUIRED");
    }
  });

  it("2. authenticated is granted the view capabilities", () => {
    expect(can(FREE(), "product.view")).toBe(true);
    expect(can(FREE(), "academy.view")).toBe(true);
    expect(() => requirePermission(FREE(), "product.view")).not.toThrow();
  });

  it("3. wrong owner is denied ownership", () => {
    const caller = subject({ profileId: "profile-attacker" });
    expect(isOwner("profile-victim", caller)).toBe(false);
    try {
      requireOwnership("profile-victim", caller, "product");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as AuthorizationError).code).toBe("OWNERSHIP_REQUIRED");
    }
  });

  it("4. correct owner passes ownership", () => {
    const caller = subject({ profileId: "profile-owner" });
    expect(isOwner("profile-owner", caller)).toBe(true);
    expect(() => requireOwnership("profile-owner", caller, "product")).not.toThrow();
  });

  it("5. wrong role is denied a role-gated capability", () => {
    const student = subject({ plan: "professional", roles: ["student"] });
    expect(can(student, "academy.students.view")).toBe(false);
    expect(decide(student, "academy.students.view").code).toBe("ROLE_REQUIRED");
  });

  it("6. correct role is granted a role-gated capability", () => {
    const instructor = subject({ plan: "professional", roles: ["instructor"] });
    expect(can(instructor, "academy.students.view")).toBe(true);
  });

  it("7. insufficient entitlement is denied", () => {
    expect(can(FREE(), "product.create")).toBe(false);
    expect(decide(FREE(), "product.create").code).toBe("ENTITLEMENT_REQUIRED");
    expect(can(FREE(), "academy.course.create")).toBe(false);
    expect(() => requireEntitlement(FREE(), "can_create_products")).toThrow(AuthorizationError);
  });

  it("8. sufficient entitlement is granted", () => {
    expect(can(PAID(), "product.create")).toBe(true);
    expect(can(PAID(), "product.publish")).toBe(true);
    expect(can(PAID(), "academy.course.create")).toBe(true);
    expect(() => requireEntitlement(PAID(), "can_create_products")).not.toThrow();
  });
});

describe("locked decision: Free may view all five major modules", () => {
  const viewPermissions: Permission[] = [
    "profile.view",
    "shopping.view",
    "academy.view",
    "expert.view",
    "localization.view",
  ];

  it("grants every module view permission on the basic plan", () => {
    for (const permission of viewPermissions) {
      expect(can(FREE(), permission)).toBe(true);
    }
  });

  it("still withholds every create and publish capability on basic", () => {
    for (const permission of [
      "product.create",
      "product.update",
      "product.delete",
      "product.publish",
      "academy.course.create",
      "academy.course.update",
      "academy.course.delete",
      "academy.course.publish",
    ] as Permission[]) {
      expect(can(FREE(), permission)).toBe(false);
    }
  });

  it("does not depend on a subscription tier name for view access", () => {
    const plans: SubscriptionPlan[] = ["basic", "professional", "business", "enterprise"];
    for (const plan of plans) {
      expect(can(subject({ plan }), "academy.view")).toBe(true);
    }
  });
});

describe("locked decision: roles, subscriptions and entitlements are separate", () => {
  it("treats the overloaded 'business' token as two unrelated values", () => {
    const businessRoleOnFreePlan = subject({ plan: "basic", roles: ["business"] });
    const businessPlanWithStudentRole = subject({ plan: "business", roles: ["student"] });

    // A business *role* grants no paid capability.
    expect(can(businessRoleOnFreePlan, "product.create")).toBe(false);
    // A business *plan* does, regardless of role.
    expect(can(businessPlanWithStudentRole, "product.create")).toBe(true);
  });

  it("denies a paid capability when the subscription is not active", () => {
    const lapsed = subject({ plan: "professional", subscriptionStatus: "cancelled" });
    expect(can(lapsed, "product.create")).toBe(false);
    expect(decide(lapsed, "product.create").code).toBe("ENTITLEMENT_REQUIRED");
  });

  it("lets an admin account bypass entitlement and role requirements", () => {
    const admin = subject({ plan: "basic", roles: ["student"], accountType: "admin" });
    expect(can(admin, "product.create")).toBe(true);
    expect(can(admin, "academy.students.view")).toBe(true);
  });
});

describe("permission catalogue", () => {
  it("declares every permission named by the phase 3 prompt", () => {
    for (const permission of [
      "product.view",
      "product.create",
      "product.update",
      "product.delete",
      "product.publish",
      "academy.view",
      "academy.course.create",
      "academy.course.update",
      "academy.course.delete",
      "academy.course.publish",
    ]) {
      expect(isPermission(permission)).toBe(true);
    }
  });

  it("has a policy rule for every declared permission", () => {
    for (const permission of PERMISSIONS) {
      expect(PERMISSION_POLICY[permission]).toBeDefined();
      expect(PERMISSION_POLICY[permission].describe.length).toBeGreaterThan(0);
    }
  });

  it("never decides a capability by comparing a subscription tier name", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    for (const file of ["permissions.ts", "policy.ts"]) {
      const src = readFileSync(resolve(process.cwd(), "src/lib/authorization", file), "utf8");
      expect(src).not.toMatch(/===\s*"(basic|professional|business|enterprise)"/);
    }
  });

  it("grants strictly more capabilities on a paid plan than on basic", () => {
    const free = grantedPermissions(FREE());
    const paid = grantedPermissions(PAID());
    expect(paid.length).toBeGreaterThan(free.length);
    for (const permission of free) {
      expect(paid).toContain(permission);
    }
  });
});

describe("client-safe boundary", () => {
  /**
   * The client-safe barrel must not pull in Clerk or the Supabase server client:
   * a client component importing it would fail the production build.
   */
  it("keeps server-only dependencies out of the client-safe module graph", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const clientSafe = ["index.ts", "permissions.ts", "policy.ts", "subject.ts", "ownership.ts", "subscription.ts"];
    for (const file of clientSafe) {
      const src = readFileSync(resolve(process.cwd(), "src/lib/authorization", file), "utf8");
      expect(src, `${file} must not import the Supabase server client`).not.toMatch(
        /@\/lib\/supabase\/server/
      );
      expect(src, `${file} must not import Clerk server helpers`).not.toMatch(
        /@clerk\/nextjs\/server/
      );
      expect(src, `${file} must not import the server user context`).not.toMatch(
        /@\/lib\/auth\/user-context/
      );
      expect(src, `${file} must not re-export the server barrel`).not.toMatch(
        /from "\.\/(server|product-ownership)"/
      );
    }
  });

  it("exposes database-backed ownership only from the server entry point", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const server = readFileSync(
      resolve(process.cwd(), "src/lib/authorization/server.ts"),
      "utf8"
    );
    expect(server).toMatch("requireProductOwnership");
    const index = readFileSync(resolve(process.cwd(), "src/lib/authorization/index.ts"), "utf8");
    expect(index).not.toMatch("requireProductOwnership");
  });
});

describe("plan activation is authorized, not merely authenticated", () => {
  const original = process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION;
    else process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION = original;
  });

  it("denies self-activating a paid plan by default", () => {
    delete process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION;
    for (const plan of ["professional", "business", "enterprise"]) {
      expect(() => requirePlanActivationAllowed(plan)).toThrow(AuthorizationError);
    }
  });

  it("denies paid activation through a legacy alias too", () => {
    delete process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION;
    expect(() => requirePlanActivationAllowed("premium")).toThrow(AuthorizationError);
    expect(() => requirePlanActivationAllowed("pro")).toThrow(AuthorizationError);
  });

  it("always allows downgrading to basic, including via the free alias", () => {
    delete process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION;
    expect(() => requirePlanActivationAllowed("basic")).not.toThrow();
    expect(() => requirePlanActivationAllowed("free")).not.toThrow();
  });

  it("allows paid activation only where the deployment opts in", () => {
    process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION = "true";
    expect(() => requirePlanActivationAllowed("professional")).not.toThrow();
  });
});
