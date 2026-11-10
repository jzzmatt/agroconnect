export function isPublicServiceStatus(status: string | null | undefined): boolean {
  return status === "published" || status === "active";
}

/** Public service page that opens the existing date request for this service. */
export function serviceBookingPath(slug: string): string {
  return `/services/${encodeURIComponent(slug)}?book=1`;
}

export function servicePagePath(slug: string): string {
  return `/services/${encodeURIComponent(slug)}`;
}

/** Unsigned recipients return to the same service booking flow after sign-in. */
export function serviceSignInPath(slug: string): string {
  return `/sign-in?redirect_url=${encodeURIComponent(serviceBookingPath(slug))}`;
}

/** Unsigned recipients can register and return to the same service booking flow. */
export function serviceSignUpPath(slug: string): string {
  return `/sign-up?redirect_url=${encodeURIComponent(serviceBookingPath(slug))}`;
}

/** A request is saved only when the existing booking action succeeds. */
export function serviceRequestOutcome(
  result: { success?: boolean } | null | undefined
): "saved" | "incomplete" {
  return result?.success === true ? "saved" : "incomplete";
}
