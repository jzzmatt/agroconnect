import { normalizePlanSlug } from "@/lib/services/pricing-service";
import { AuthorizationError } from "./policy";

/**
 * Whether this deployment permits a user to activate a paid plan for themselves
 * without a verified payment.
 *
 * Defaults to false. Sandbox and local environments opt in explicitly by setting
 * `ALLOW_SELF_SERVICE_PLAN_ACTIVATION=true`, which is how the demo checkout flow
 * keeps working without leaving the escalation path open everywhere else.
 */
export function isSelfServicePaidActivationEnabled(): boolean {
  return process.env.ALLOW_SELF_SERVICE_PLAN_ACTIVATION === "true";
}

/**
 * Guard the plan activation path.
 *
 * Authentication alone must not let a user choose their own commercial tier:
 * doing so grants every paid entitlement for free. Downgrading to `basic` stays
 * self-service, because cancelling is legitimately the user's own decision.
 *
 * Verified-payment activation arrives with the commerce work in phase 11. Until
 * then a paid plan may only be activated where this deployment has explicitly
 * opted in.
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
