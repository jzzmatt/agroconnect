export type MapDiagnosticAudience = "developer" | "user";

export interface MapDiagnostic {
  code: string;
  operation: string;
  message: string;
  audience: MapDiagnosticAudience;
  externalActionRequired: boolean;
  externalActionSteps?: string[];
}

const EXTERNAL_ACTION_HEADER = "EXTERNAL ACTION REQUIRED";

export function formatExternalActionReport(diagnostic: MapDiagnostic): string {
  if (!diagnostic.externalActionRequired || !diagnostic.externalActionSteps?.length) {
    return diagnostic.message;
  }
  return [
    EXTERNAL_ACTION_HEADER,
    "",
    `Problem: ${diagnostic.message}`,
    "",
    `Detected error: ${diagnostic.code}`,
    "",
    "What you need to do:",
    ...diagnostic.externalActionSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "After completing these steps, retry the application.",
  ].join("\n");
}

export function diagnoseGoogleMapsError(
  error: unknown,
  operation = "Maps JavaScript API"
): MapDiagnostic {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  const code = extractGoogleErrorCode(raw);

  switch (code) {
    case "MissingKeyMapError":
      return {
        code,
        operation,
        message: "Google Maps API key is not configured.",
        audience: "developer",
        externalActionRequired: true,
        externalActionSteps: [
          "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local for local development.",
          "Add the same variable in Vercel → Project → Settings → Environment Variables for Production and Preview.",
          "Redeploy after changing the Vercel variable.",
        ],
      };
    case "ApiNotActivatedMapError":
      return {
        code,
        operation,
        message: "Maps JavaScript API is not enabled for this Google Cloud project.",
        audience: "developer",
        externalActionRequired: true,
        externalActionSteps: [
          "Open Google Cloud Console → APIs & Services → Library.",
          "Search for Maps JavaScript API and click Enable.",
          "If using Places search, also enable Places API (New).",
        ],
      };
    case "ApiTargetBlockedMapError":
      return {
        code,
        operation,
        message: "The API key is not authorized to call the required Google Maps APIs.",
        audience: "developer",
        externalActionRequired: true,
        externalActionSteps: [
          "Open Google Cloud Console → APIs & Services → Credentials.",
          "Select the browser API key used by AgroConnect.",
          "Under API restrictions, allow Maps JavaScript API and Places API (New).",
          "Save and retry.",
        ],
      };
    case "RefererNotAllowedMapError":
      return {
        code,
        operation,
        message: "This site is not authorized to use the Google Maps API key.",
        audience: "developer",
        externalActionRequired: true,
        externalActionSteps: [
          "Open Google Cloud Console → APIs & Services → Credentials → your API key.",
          "Under Application restrictions → HTTP referrers, add:",
          "https://agroconnect-git-main-jzzmatts-projects.vercel.app/*",
          "http://localhost:3000/*",
          "Save. Redeploy is not required if only referrer rules changed.",
        ],
      };
    case "BillingNotEnabledMapError":
      return {
        code,
        operation,
        message: "Google Maps billing is not enabled for the Cloud project.",
        audience: "developer",
        externalActionRequired: true,
        externalActionSteps: [
          "Open Google Cloud Console → Billing.",
          "Link a billing account to the project that owns the API key.",
          "Confirm Maps JavaScript API and Places API (New) remain enabled.",
        ],
      };
    case "InvalidKeyMapError":
      return {
        code,
        operation,
        message: "The Google Maps API key is invalid.",
        audience: "developer",
        externalActionRequired: true,
        externalActionSteps: [
          "Create or copy a valid browser API key in Google Cloud Console.",
          "Update NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel and .env.local.",
          "Redeploy the application.",
        ],
      };
    case "OverQuotaMapError":
    case "OVER_QUERY_LIMIT":
      return {
        code,
        operation,
        message: "Google Maps quota exceeded.",
        audience: "developer",
        externalActionRequired: true,
        externalActionSteps: [
          "Open Google Cloud Console → APIs & Services → Dashboard.",
          "Review usage and quotas for Maps JavaScript API and Places API (New).",
          "Increase quotas or wait for the daily reset.",
        ],
      };
    default:
      return {
        code: code || "UNKNOWN",
        operation,
        message: raw || "Google Maps failed to initialize.",
        audience: "developer",
        externalActionRequired: false,
      };
  }
}

function extractGoogleErrorCode(message: string): string {
  const known = [
    "MissingKeyMapError",
    "ApiNotActivatedMapError",
    "ApiTargetBlockedMapError",
    "RefererNotAllowedMapError",
    "BillingNotEnabledMapError",
    "InvalidKeyMapError",
    "OverQuotaMapError",
    "OVER_QUERY_LIMIT",
  ];
  for (const code of known) {
    if (message.includes(code)) return code;
  }
  return message.split(":")[0]?.trim() || "UNKNOWN";
}

export function logMapDiagnostic(diagnostic: MapDiagnostic, error?: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  console.error("[AgriLocalization Map]", {
    operation: diagnostic.operation,
    code: diagnostic.code,
    message: diagnostic.message,
    externalActionRequired: diagnostic.externalActionRequired,
    detail: error instanceof Error ? error.message : undefined,
  });
  if (diagnostic.externalActionRequired) {
    console.error(formatExternalActionReport(diagnostic));
  }
}
