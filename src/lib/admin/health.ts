import { isSupabaseConfigured } from "@/lib/supabase/admin";

export type HealthCheckId = "application" | "database" | "clerk" | "payment" | "media" | "whatsapp";
export type HealthStatus = "pass" | "warning" | "failed";
export type HealthReason =
  | "ready"
  | "missing_url"
  | "not_configured"
  | "unreachable"
  | "privileged_unavailable";

export interface HealthCheck {
  id: HealthCheckId;
  status: HealthStatus;
  reason: HealthReason;
}

export interface HealthInputs {
  appUrl: boolean;
  databaseConfigured: boolean;
  databaseReachable: boolean | null;
  privileged: boolean;
  clerk: boolean;
  payment: boolean;
  media: boolean;
  whatsapp: boolean;
}

function present(name: string): boolean {
  const value = process.env[name] || "";
  return value.length > 0 && !value.includes("placeholder");
}

/** Booleans only. Callers must not pass secret values into the report. */
export function readHealthInputs(databaseReachable: boolean | null): HealthInputs {
  return {
    appUrl: present("NEXT_PUBLIC_APP_URL"),
    databaseConfigured: isSupabaseConfigured(),
    databaseReachable,
    privileged: present("SUPABASE_SERVICE_ROLE_KEY"),
    clerk: present("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && present("CLERK_SECRET_KEY"),
    payment: present("PAYMENT_WEBHOOK_SECRET"),
    media:
      present("IMAGEKIT_PUBLIC_KEY") &&
      present("IMAGEKIT_PRIVATE_KEY") &&
      present("IMAGEKIT_URL_ENDPOINT"),
    whatsapp: present("WAAPI_API_TOKEN"),
  };
}

export function buildHealthReport(input: HealthInputs): HealthCheck[] {
  const database: HealthCheck = !input.databaseConfigured
    ? { id: "database", status: "failed", reason: "not_configured" }
    : input.databaseReachable === false
      ? { id: "database", status: "failed", reason: "unreachable" }
      : input.privileged
        ? { id: "database", status: "pass", reason: "ready" }
        : { id: "database", status: "warning", reason: "privileged_unavailable" };

  return [
    input.appUrl
      ? { id: "application", status: "pass", reason: "ready" }
      : { id: "application", status: "warning", reason: "missing_url" },
    database,
    input.clerk
      ? { id: "clerk", status: "pass", reason: "ready" }
      : { id: "clerk", status: "failed", reason: "not_configured" },
    input.payment
      ? { id: "payment", status: "pass", reason: "ready" }
      : { id: "payment", status: "warning", reason: "not_configured" },
    input.media
      ? { id: "media", status: "pass", reason: "ready" }
      : { id: "media", status: "warning", reason: "not_configured" },
    input.whatsapp
      ? { id: "whatsapp", status: "pass", reason: "ready" }
      : { id: "whatsapp", status: "warning", reason: "not_configured" },
  ];
}
