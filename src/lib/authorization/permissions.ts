import type { UserRoleType } from "@/types/database";
import type { UserEntitlements } from "@/types/domain";

/**
 * Granular capability names. A guard asks for the capability it needs, never for
 * the subscription tier that happens to grant that capability today.
 */
export const PERMISSIONS = [
  // Module access. Every authenticated user may view the five major modules,
  // including Free/basic. Viewing is not a paid capability.
  "profile.view",
  "shopping.view",
  "academy.view",
  "expert.view",
  "localization.view",

  // Products
  "product.view",
  "product.create",
  "product.update",
  "product.delete",
  "product.publish",
  "product.image.upload",
  "product.video.upload",
  "product.inventory.manage",

  // Academy
  "academy.course.create",
  "academy.course.update",
  "academy.course.delete",
  "academy.course.publish",
  "academy.video.upload",
  "academy.students.view",

  // Expert services
  "service.view",
  "service.create",
  "service.manage",

  // Localization
  "location.manage",

  // Account and commercial
  "market.country.change",
  "payment_gateway.request",
  "subscription.activate_paid",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Entitlement flags that a permission may depend on. */
export type EntitlementFlag = {
  [K in keyof UserEntitlements]: UserEntitlements[K] extends boolean ? K : never;
}[keyof UserEntitlements];

/**
 * How one permission is decided.
 *
 * The three concepts stay separate here by construction: `entitlement` consults
 * the entitlement resolver, `roles` consults the user's roles, and neither reads
 * a subscription tier name. A rule with no `entitlement` and no `roles` is
 * granted to any authenticated user.
 */
export interface PermissionRule {
  /** Entitlement flag that must be true. */
  entitlement?: EntitlementFlag;
  /** At least one of these roles is required. Empty means any role. */
  roles?: UserRoleType[];
  /** Human-readable reason, surfaced in errors and logs. */
  describe: string;
}

/**
 * The policy table. Adding a capability means adding a row here, not adding a
 * plan comparison at a call site.
 *
 * `roles` is deliberately unset for most rows: requiring a role today would
 * change access for existing users, all of whom default to `student`. The
 * mechanism is enforced (see `academy.students.view`) so that phases 7 to 9 can
 * populate instructor and student requirements without touching the engine.
 */
export const PERMISSION_POLICY: Record<Permission, PermissionRule> = {
  "profile.view": { describe: "View own profile workspace" },
  "shopping.view": { describe: "Browse AgriShopping" },
  "academy.view": { describe: "Browse AgriAcademy" },
  "expert.view": { describe: "Browse AgriExpert" },
  "localization.view": { describe: "Browse Localization" },

  "product.view": { describe: "View products" },
  "product.create": {
    entitlement: "can_create_products",
    describe: "Create a product",
  },
  "product.update": {
    entitlement: "can_edit_products",
    describe: "Update a product",
  },
  "product.delete": {
    entitlement: "can_edit_products",
    describe: "Delete a product",
  },
  "product.publish": {
    entitlement: "can_publish_products",
    describe: "Publish a product",
  },
  "product.image.upload": {
    entitlement: "can_upload_product_images",
    describe: "Upload a product image",
  },
  "product.video.upload": {
    entitlement: "can_upload_product_video",
    describe: "Upload a product short video",
  },
  "product.inventory.manage": {
    entitlement: "can_manage_inventory",
    describe: "Manage product inventory",
  },

  "academy.course.create": {
    entitlement: "can_create_courses",
    describe: "Create a course",
  },
  "academy.course.update": {
    entitlement: "can_teach_courses",
    describe: "Update a course",
  },
  "academy.course.delete": {
    entitlement: "can_teach_courses",
    describe: "Delete a course",
  },
  "academy.course.publish": {
    entitlement: "can_publish_courses",
    describe: "Publish a course",
  },
  "academy.video.upload": {
    entitlement: "can_create_courses",
    describe: "Upload an Academy training video",
  },
  "academy.students.view": {
    entitlement: "can_teach_courses",
    roles: ["instructor"],
    describe: "View enrolled students",
  },

  "service.view": { describe: "View expert services" },
  "service.create": {
    entitlement: "can_manage_services",
    describe: "Create a service",
  },
  "service.manage": {
    entitlement: "can_manage_services",
    describe: "Manage own services",
  },

  "location.manage": {
    entitlement: "can_manage_locations",
    describe: "Manage locations",
  },

  "market.country.change": {
    entitlement: "can_change_market_country",
    describe: "Change market country",
  },
  "payment_gateway.request": {
    entitlement: "can_request_custom_payment_gateway",
    describe: "Request a custom payment gateway",
  },
  "subscription.activate_paid": {
    describe: "Activate a paid subscription for oneself",
  },
};

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
