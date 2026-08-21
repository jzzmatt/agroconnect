"use client";

import { useState, useCallback } from "react";
import type { GeoCoordinate } from "@/types/domain";
import type { UserLocationState } from "@/lib/location/types";
import { isValidCoordinate } from "@/lib/location/location-service";

export type GeolocationStatus =
  | "idle"
  | "prompting"
  | "loading"
  | "success"
  | "denied"
  | "unavailable"
  | "timeout"
  | "error";

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [location, setLocation] = useState<UserLocationState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<GeoCoordinate | null> => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      setErrorMessage("A geolocalização não é suportada pelo seu navegador.");
      return null;
    }

    setStatus("loading");
    setErrorMessage(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GeoCoordinate = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          if (!isValidCoordinate(coords)) {
            setStatus("error");
            setErrorMessage("Coordenadas geográficas inválidas recebidas.");
            resolve(null);
            return;
          }

          const newState: UserLocationState = {
            coordinates: coords,
            administrative: null,
            accuracyMeters: position.coords.accuracy,
            source: "gps",
            timestamp: position.timestamp || Date.now(),
          };

          setLocation(newState);
          setStatus("success");
          resolve(coords);
        },
        (error) => {
          let userMsg = "Não foi possível obter a sua localização.";
          let nextStatus: GeolocationStatus = "error";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              nextStatus = "denied";
              userMsg = "Permissão de localização recusada. Pode escolher a província e município manualmente.";
              break;
            case error.POSITION_UNAVAILABLE:
              nextStatus = "unavailable";
              userMsg = "Informações de localização indisponíveis no momento.";
              break;
            case error.TIMEOUT:
              nextStatus = "timeout";
              userMsg = "O pedido de localização expirou. Tente novamente ou escolha manualmente.";
              break;
          }

          setStatus(nextStatus);
          setErrorMessage(userMsg);
          resolve(null);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 60000,
        }
      );
    });
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge]);

  const setManualLocation = useCallback((coords: GeoCoordinate, addressLabel?: string) => {
    if (!isValidCoordinate(coords)) return;

    setLocation({
      coordinates: coords,
      administrative: addressLabel ? { countryName: "Angola", countryCode: "AO", provinceName: addressLabel } : null,
      source: "manual",
      timestamp: Date.now(),
      isCustom: true,
    });
    setStatus("success");
    setErrorMessage(null);
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setLocation(null);
    setErrorMessage(null);
  }, []);

  return {
    status,
    location,
    coordinates: location?.coordinates ?? null,
    errorMessage,
    isLoading: status === "loading",
    isSuccess: status === "success",
    isDenied: status === "denied",
    requestLocation,
    setManualLocation,
    reset,
  };
}
