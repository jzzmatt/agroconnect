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

export interface ServiceRequestDraft {
  serviceId: string;
  message: string;
  requestedDate: string;
  locationNotes: string;
}

export function serviceRequestDraftKey(serviceId: string): string {
  return `agroconnect.service-request.${serviceId}`;
}

/** Keeps the filled request only until the visitor signs in and sends it. */
export function writeServiceRequestDraft(
  storage: Pick<Storage, "setItem">,
  draft: ServiceRequestDraft
): void {
  const message = draft.message.trim();
  if (!draft.serviceId || !message) return;
  storage.setItem(
    serviceRequestDraftKey(draft.serviceId),
    JSON.stringify({
      serviceId: draft.serviceId,
      message,
      requestedDate: draft.requestedDate,
      locationNotes: draft.locationNotes,
    })
  );
}

export function readServiceRequestDraft(
  storage: Pick<Storage, "getItem">,
  serviceId: string
): ServiceRequestDraft | null {
  const raw = storage.getItem(serviceRequestDraftKey(serviceId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceRequestDraft>;
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (parsed.serviceId !== serviceId || !message) return null;
    return {
      serviceId,
      message,
      requestedDate: typeof parsed.requestedDate === "string" ? parsed.requestedDate : "",
      locationNotes: typeof parsed.locationNotes === "string" ? parsed.locationNotes : "",
    };
  } catch {
    return null;
  }
}

export function clearServiceRequestDraft(storage: Pick<Storage, "removeItem">, serviceId: string): void {
  storage.removeItem(serviceRequestDraftKey(serviceId));
}

/** A request is saved only when the existing booking action succeeds. */
export function serviceRequestOutcome(
  result: { success?: boolean } | null | undefined
): "saved" | "incomplete" {
  return result?.success === true ? "saved" : "incomplete";
}
