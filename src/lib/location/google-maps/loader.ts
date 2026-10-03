import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export type GoogleMapsLoadStatus = "idle" | "loading" | "ready" | "error";

let loadPromise: Promise<typeof google> | null = null;
let loadStatus: GoogleMapsLoadStatus = "idle";
let lastLoadError: unknown = null;
let optionsApplied = false;

export function getGoogleMapsApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || undefined;
}

/** Optional Cloud Map ID — required only for Advanced Markers; omit to use classic markers. */
export function getGoogleMapsMapId(): string | undefined {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
  return mapId || undefined;
}

export function canUseAdvancedMarkers(): boolean {
  return Boolean(getGoogleMapsMapId());
}

const AUTH_FAILURE_EVENT = "agroconnect:google-maps-auth-failure";

export function registerGoogleMapsAuthFailureHandler(): void {
  if (typeof window === "undefined") return;
  (window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent(AUTH_FAILURE_EVENT));
  };
}

export function subscribeGoogleMapsAuthFailure(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_FAILURE_EVENT, listener);
  return () => window.removeEventListener(AUTH_FAILURE_EVENT, listener);
}

export function getGoogleMapsLoadStatus(): GoogleMapsLoadStatus {
  return loadStatus;
}

export function getGoogleMapsLastError(): unknown {
  return lastLoadError;
}

/**
 * Loads the Google Maps JavaScript API once per browser session.
 * Never logs or returns the API key.
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    const err = new Error("MissingKeyMapError");
    lastLoadError = err;
    loadStatus = "error";
    throw err;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadStatus = "loading";

  registerGoogleMapsAuthFailureHandler();

  if (!optionsApplied) {
    setOptions({
      key: apiKey,
      v: "weekly",
      region: "AO",
      libraries: ["places"],
    });
    optionsApplied = true;
  }

  const libraries: Array<"maps" | "places" | "marker"> = ["maps", "places"];
  if (canUseAdvancedMarkers()) {
    libraries.push("marker");
  }

  loadPromise = Promise.all(libraries.map((name) => importLibrary(name)))
    .then(() => {
      loadStatus = "ready";
      lastLoadError = null;
      return google;
    })
    .catch((error: unknown) => {
      loadStatus = "error";
      lastLoadError = error;
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}

export function resetGoogleMapsLoaderForTests(): void {
  loadPromise = null;
  loadStatus = "idle";
  lastLoadError = null;
  optionsApplied = false;
}
