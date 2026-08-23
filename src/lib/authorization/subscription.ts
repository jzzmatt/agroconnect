import { normalizePlanSlug } from "@/lib/services/pricing-service";
import { AuthorizationError } from "./policy";

/**
 * Whether this deployment permits a user to activate a paid plan for themselves
 * without a verified payment.
 *
 * Unset, this allows self-selection outside production so the plan flow stays
 * testable, and denies it in production, where a confirmed payment must gate the
 * unlock. `ALLOW_SELF_SERVICE_PLAN_ACTIVATION` overrides the default in either
 * direction, so a staging environment can be locked down and a production-like
 * demo can be opened up deliberately.
 */
export function isSelfServicePaidActivationEnabled(): boolean {
  const explicit = process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/**
 * Guard the plan activation path.
 *
 * In production, authentication alone must not let a user choose their own
 * commercial tier: doing so grants every paid entitlement for free, so a
 * confirmed payment is required before the unlock. Outside production the plan
 * can be selected freely for testing.
 *
 * Downgrading to `basic` is always self-service, because cancelling is
 * legitimately the user's own decision.
 *
 * Verified-payment activation arrives with the commerce work in phase 11. Until
 * that exists, production denies paid self-activation outright rather than
 * pretending to verify it.
 */
export function requirePlanActivationAllowed(requestedPlan: string): void {
  const plan = normalizePlanSlug(requestedPlan);
  if (plan === "basic") return;
  if (isSelfServicePaidActivationEnabled()) return;

  throw new AuthorizationError(
    "PERMISSION_DENIED",
    `PERMISSION_DENIED: activating the ${plan} plan requires a verified payment`
  );
}
