import type {
  IMapProvider,
  MapOptions,
  MapMarkerDescriptor,
  MapLayerType,
} from "./types";
import type { GeoCoordinate } from "@/types/domain";
import {
  canUseAdvancedMarkers,
  getGoogleMapsMapId,
  loadGoogleMaps,
  subscribeGoogleMapsAuthFailure,
} from "../google-maps/loader";
import { GOOGLE_MAP_DARK_STYLES } from "../google-maps/map-styles";
import { diagnoseGoogleMapsError, logMapDiagnostic } from "../google-maps/diagnostics";

type StoredMarker = {
  marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
  infoWindow?: google.maps.InfoWindow;
  clickListener?: google.maps.MapsEventListener;
};

export class GoogleMapProvider implements IMapProvider {
  public readonly id = "google-maps";
  public readonly name = "Google Maps";

  private map: google.maps.Map | null = null;
  private markersMap = new Map<string, StoredMarker>();
  private userLocationMarker: google.maps.Marker | null = null;
  private currentCenter: GeoCoordinate = { latitude: -12.5, longitude: 17.5 };
  private currentZoom = 6;
  private currentLayerType: MapLayerType = "map";
  private pendingMarkers: MapMarkerDescriptor[] = [];
  private initGeneration = 0;
  private containerEl: HTMLElement | null = null;
  private mapClickListener: google.maps.MapsEventListener | null = null;
  private mapClickHandler: ((coordinates: GeoCoordinate) => void) | null = null;
  private authFailureUnsubscribe: (() => void) | null = null;

  constructor(initialLayer: MapLayerType = "map") {
    this.currentLayerType = initialLayer;
  }

  public async initialize(options: MapOptions): Promise<void> {
    if (typeof window === "undefined") return;

    const generation = ++this.initGeneration;
    const container =
      typeof options.container === "string"
        ? (document.getElementById(options.container) as HTMLElement | null)
        : options.container;

    if (!container) return;
    this.containerEl = container;

    if (options.center) this.currentCenter = options.center;
    if (options.zoom !== undefined) this.currentZoom = options.zoom;
    if (options.layerType) this.currentLayerType = options.layerType;

    this.destroyMapOnly();

    try {
      const googleMaps = await loadGoogleMaps();
      if (generation !== this.initGeneration) return;

      const mapId = getGoogleMapsMapId();
      const useAdvancedMarkers = canUseAdvancedMarkers();
      if (useAdvancedMarkers) {
        await googleMaps.maps.importLibrary("marker");
      }

      const mapTypeId = this.resolveMapTypeId(this.currentLayerType);
      const isDarkRoadmap =
        this.currentLayerType === "dark" || this.currentLayerType === "light";

      this.map = new googleMaps.maps.Map(container, {
        center: {
          lat: this.currentCenter.latitude,
          lng: this.currentCenter.longitude,
        },
        zoom: this.currentZoom,
        minZoom: options.minZoom ?? 3,
        maxZoom: options.maxZoom ?? 20,
        mapId,
        mapTypeId,
        styles:
          !mapId && isDarkRoadmap && mapTypeId === googleMaps.maps.MapTypeId.ROADMAP
            ? GOOGLE_MAP_DARK_STYLES
            : undefined,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: options.interactive === false ? "none" : "greedy",
      });

      this.authFailureUnsubscribe?.();
      this.authFailureUnsubscribe = subscribeGoogleMapsAuthFailure(() => {
        if (generation !== this.initGeneration) return;
        const err = new Error("Google Maps authentication failed (gm_authFailure)");
        const diagnostic = diagnoseGoogleMapsError(err, "Maps JavaScript API");
        logMapDiagnostic(diagnostic, err);
        options.onError?.(err);
      });

      this.map.addListener("idle", () => {
        if (!this.map) return;
        const c = this.map.getCenter();
        if (c) {
          this.currentCenter = { latitude: c.lat(), longitude: c.lng() };
        }
        this.currentZoom = this.map.getZoom() ?? this.currentZoom;
      });

      if (options.onMapClick) {
        this.setOnMapClick(options.onMapClick);
      }

      this.flushPendingMarkers();
      this.resize();

      if (options.onLoad) options.onLoad();
    } catch (err) {
      if (generation !== this.initGeneration) return;
      const diagnostic = diagnoseGoogleMapsError(err, "Maps JavaScript API");
      logMapDiagnostic(diagnostic, err);
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(diagnostic.message));
      }
    }
  }

  private resolveMapTypeId(layer: MapLayerType): google.maps.MapTypeId {
    if (layer === "satellite" || layer === "hybrid") {
      return google.maps.MapTypeId.HYBRID;
    }
    return google.maps.MapTypeId.ROADMAP;
  }

  private destroyMapOnly(): void {
    this.authFailureUnsubscribe?.();
    this.authFailureUnsubscribe = null;
    this.clearMarkers();
    this.removeUserLocationMarker();
    if (this.mapClickListener) {
      google.maps.event.removeListener(this.mapClickListener);
      this.mapClickListener = null;
    }
    this.mapClickHandler = null;
    this.map = null;
    if (this.containerEl) {
      this.containerEl.replaceChildren();
    }
  }

  public setLayerType(layerType: MapLayerType): void {
    this.currentLayerType = layerType;
    if (!this.map) return;
    const mapTypeId = this.resolveMapTypeId(layerType);
    this.map.setMapTypeId(mapTypeId);
    const isDark = layerType === "dark" || layerType === "light";
    this.map.setOptions({
      styles:
        isDark && mapTypeId === google.maps.MapTypeId.ROADMAP
          ? GOOGLE_MAP_DARK_STYLES
          : undefined,
    });
  }

  public getLayerType(): MapLayerType {
    return this.currentLayerType;
  }

  public setCenter(center: GeoCoordinate, zoom?: number, duration = 800): void {
    this.currentCenter = center;
    if (zoom !== undefined) this.currentZoom = zoom;
    if (!this.map) return;

    const target = { lat: center.latitude, lng: center.longitude };
    const targetZoom = zoom ?? this.map.getZoom() ?? this.currentZoom;

    if (duration <= 0) {
      this.map.setCenter(target);
      this.map.setZoom(targetZoom);
      return;
    }

    this.map.panTo(target);
    if (zoom !== undefined && this.map.getZoom() !== targetZoom) {
      window.setTimeout(() => this.map?.setZoom(targetZoom), Math.min(duration, 400));
    }
  }

  public getCenter(): GeoCoordinate {
    if (this.map) {
      const c = this.map.getCenter();
      if (c) return { latitude: c.lat(), longitude: c.lng() };
    }
    return this.currentCenter;
  }

  public setZoom(zoom: number): void {
    this.currentZoom = zoom;
    this.map?.setZoom(zoom);
  }

  public getZoom(): number {
    return this.map?.getZoom() ?? this.currentZoom;
  }

  public resize(): void {
    if (!this.map || !this.containerEl) return;
    google.maps.event.trigger(this.map, "resize");
    this.map.setCenter({
      lat: this.currentCenter.latitude,
      lng: this.currentCenter.longitude,
    });
  }

  public async addMarker(descriptor: MapMarkerDescriptor): Promise<void> {
    if (!this.map) {
      this.pendingMarkers.push(descriptor);
      return;
    }

    this.removeMarker(descriptor.id);

    const position = {
      lat: descriptor.coordinates.latitude,
      lng: descriptor.coordinates.longitude,
    };

    let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
    let infoWindow: google.maps.InfoWindow | undefined;

    const useAdvanced = canUseAdvancedMarkers() && google.maps.marker?.AdvancedMarkerElement;
    if (useAdvanced) {
      const content = descriptor.element ?? this.buildDefaultMarkerElement(descriptor.color);
      marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position,
        title: descriptor.title,
        content,
      });
    } else {
      const scale = descriptor.element?.className.includes("w-10") ? 12 : 10;
      marker = new google.maps.Marker({
        map: this.map,
        position,
        title: descriptor.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale,
          fillColor: descriptor.color || "#0E6B38",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    }

    if (descriptor.popupHtml) {
      infoWindow = new google.maps.InfoWindow({ content: descriptor.popupHtml });
    }

    const clickListener = marker.addListener("click", () => {
      if (infoWindow && this.map) {
        if (marker instanceof google.maps.Marker) {
          infoWindow.open({ map: this.map, anchor: marker });
        } else {
          infoWindow.open({ map: this.map });
        }
      }
      descriptor.onClick?.();
    });

    this.markersMap.set(descriptor.id, { marker, infoWindow, clickListener });
  }

  private buildDefaultMarkerElement(color?: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `width:32px;height:32px;border-radius:50%;background:${color || "#0E6B38"};border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;`;
    el.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';
    return el;
  }

  private flushPendingMarkers(): void {
    if (!this.pendingMarkers.length) return;
    const list = [...this.pendingMarkers];
    this.pendingMarkers = [];
    list.forEach((marker) => void this.addMarker(marker));
  }

  public removeMarker(markerId: string): void {
    const stored = this.markersMap.get(markerId);
    if (!stored) return;
    if (stored.clickListener) {
      google.maps.event.removeListener(stored.clickListener);
    }
    stored.infoWindow?.close();
    if (stored.marker instanceof google.maps.Marker) {
      stored.marker.setMap(null);
    } else {
      stored.marker.map = null;
    }
    this.markersMap.delete(markerId);
  }

  public clearMarkers(): void {
    this.markersMap.forEach((_, id) => this.removeMarker(id));
    this.markersMap.clear();
    this.pendingMarkers = [];
  }

  public async addUserLocationMarker(coordinates: GeoCoordinate): Promise<void> {
    if (!this.map) return;
    this.removeUserLocationMarker();
    this.userLocationMarker = new google.maps.Marker({
      map: this.map,
      position: { lat: coordinates.latitude, lng: coordinates.longitude },
      title: "Minha localização",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#2563EB",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 1000,
    });
  }

  public removeUserLocationMarker(): void {
    this.userLocationMarker?.setMap(null);
    this.userLocationMarker = null;
  }

  public fitBounds(bounds: [GeoCoordinate, GeoCoordinate], padding = 40): void {
    if (!this.map) return;
    const [sw, ne] = bounds;
    const googleBounds = new google.maps.LatLngBounds(
      { lat: sw.latitude, lng: sw.longitude },
      { lat: ne.latitude, lng: ne.longitude }
    );
    this.map.fitBounds(googleBounds, padding);
  }

  public setOnMapClick(handler: ((coordinates: GeoCoordinate) => void) | null): void {
    this.mapClickHandler = handler;
    if (this.mapClickListener) {
      google.maps.event.removeListener(this.mapClickListener);
      this.mapClickListener = null;
    }
    if (!this.map || !handler) return;

    this.mapClickListener = this.map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      handler({
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng(),
      });
    });
  }

  public destroy(): void {
    this.initGeneration += 1;
    this.destroyMapOnly();
    this.containerEl = null;
  }
}
