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

  if (!optionsApplied) {
    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places", "marker", "geocoding"],
    });
    optionsApplied = true;
  }

  loadPromise = Promise.all([
    importLibrary("maps"),
    importLibrary("marker"),
    importLibrary("places"),
  ])
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
