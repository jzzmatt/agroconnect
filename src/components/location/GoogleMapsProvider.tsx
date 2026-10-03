"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getGoogleMapsApiKey,
  getGoogleMapsLoadStatus,
  loadGoogleMaps,
  type GoogleMapsLoadStatus,
} from "@/lib/location/google-maps/loader";
import { diagnoseGoogleMapsError, logMapDiagnostic } from "@/lib/location/google-maps/diagnostics";

type GoogleMapsContextValue = {
  status: GoogleMapsLoadStatus;
  hasApiKey: boolean;
  errorMessage: string | null;
  retry: () => void;
};

const GoogleMapsContext = createContext<GoogleMapsContextValue | null>(null);

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GoogleMapsLoadStatus>(() => getGoogleMapsLoadStatus());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasApiKey = Boolean(getGoogleMapsApiKey());

  useEffect(() => {
    if (!hasApiKey) {
      setStatus("error");
      setErrorMessage("MissingKeyMapError");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);

    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        const diagnostic = diagnoseGoogleMapsError(error, "Maps JavaScript API preload");
        logMapDiagnostic(diagnostic, error);
        setStatus("error");
        setErrorMessage(diagnostic.code);
      });

    return () => {
      cancelled = true;
    };
  }, [hasApiKey, attempt]);

  const value = useMemo<GoogleMapsContextValue>(
    () => ({
      status,
      hasApiKey,
      errorMessage,
      retry: () => setAttempt((n) => n + 1),
    }),
    [status, hasApiKey, errorMessage]
  );

  return <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>;
}

export function useGoogleMapsContext(): GoogleMapsContextValue {
  const ctx = useContext(GoogleMapsContext);
  if (!ctx) {
    return {
      status: getGoogleMapsLoadStatus(),
      hasApiKey: Boolean(getGoogleMapsApiKey()),
      errorMessage: null,
      retry: () => undefined,
    };
  }
  return ctx;
}
