import { normalizePlanSlug } from "@/lib/services/pricing-service";
import { AuthorizationError } from "./policy";

/**
 * Whether this deployment permits a user to activate a paid plan for themselves
 * without a verified payment.
 *
 * Enabled by default in every environment, so plans can be selected freely while
 * the product is being built and demonstrated. Set
 * `ALLOW_SELF_SERVICE_PLAN_ACTIVATION=false` to turn it off, which is the switch
 * to throw once payment confirmation gates the unlock in phase 11.
 *
 * While enabled, any authenticated user can grant themselves any tier and every
 * paid entitlement that comes with it.
 */
export function isSelfServicePaidActivationEnabled(): boolean {
  return process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION !== "false";
}

/**
 * Guard the plan activation path.
 *
 * Self-service activation is on by default, so a user may select any tier. Once
 * `ALLOW_SELF_SERVICE_PLAN_ACTIVATION=false` is set, a paid tier requires a
 * confirmed payment and this guard rejects the request instead.
 *
 * Downgrading to `basic` is always self-service, because cancelling is
 * legitimately the user's own decision.
 *
 * Verified-payment activation arrives with the commerce work in phase 11. Until
 * that exists the switch is the only gate, so disabling it denies paid
 * activation outright rather than pretending to verify a payment.
 */
export function requirePlanActivationAllowed(requestedPlan: string): void {
  const plan = normalizePlanSlug(requestedPlan);
  if (plan === "basic") return;
  if (isSelfServicePaidActivationEnabled()) return;

  throw new AuthorizationError(
    "PERMISSION_DENIED",
    `PERMISSION_DENIED: activating the ${plan} plan requires a confirmed payment`
  );
}
