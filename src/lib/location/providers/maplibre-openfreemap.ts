import type {
  IMapProvider,
  MapOptions,
  MapMarkerDescriptor,
  MapViewMode,
} from "./types";
import type { GeoCoordinate } from "@/types/domain";

/**
 * OpenFreeMap official documented style endpoints
 */
export const OPEN_FREE_MAP_STYLES = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  bright: "https://tiles.openfreemap.org/styles/bright",
  positron: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export type OpenFreeMapStyleName = keyof typeof OPEN_FREE_MAP_STYLES;

/**
 * Returns the appropriate OpenFreeMap style URL based on theme ('light' | 'dark')
 */
export function getThemeMapStyle(theme: "light" | "dark" = "light"): string {
  if (theme === "dark") {
    return (
      process.env.NEXT_PUBLIC_MAP_DARK_STYLE_URL ||
      OPEN_FREE_MAP_STYLES.dark
    );
  }
  return (
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    OPEN_FREE_MAP_STYLES.liberty
  );
}

/**
 * MapLibre + OpenFreeMap implementation of IMapProvider.
 * Provides vector tile rendering (roads, streets, labels, cities, water, 3D buildings),
 * 2D/3D camera transitions, markers, user location pulse, and navigation controls.
 */
export class MapLibreOpenFreeMapProvider implements IMapProvider {
  public readonly id = "maplibre-openfreemap";
  public readonly name = "OpenFreeMap (MapLibre GL)";

  private mapInstance: any = null;
  private markersMap: Map<string, any> = new Map();
  private userLocationMarker: any = null;
  private styleUrl: string;
  private currentCenter: GeoCoordinate;
  private currentZoom: number;
  private currentPitch: number;
  private currentBearing: number;
  private isMapLoaded = false;
  private pendingMarkers: MapMarkerDescriptor[] = [];

  constructor(style: OpenFreeMapStyleName | string = "liberty") {
    this.styleUrl =
      style in OPEN_FREE_MAP_STYLES
        ? OPEN_FREE_MAP_STYLES[style as OpenFreeMapStyleName]
        : style;
    // Default geographic center of Angola (near Huambo/Bié)
    this.currentCenter = { latitude: -12.5, longitude: 17.5 };
    this.currentZoom = 6;
    this.currentPitch = 0;
    this.currentBearing = 0;
  }

  public setStyle(newStyleUrl: string): void {
    this.styleUrl = newStyleUrl;
    if (this.mapInstance) {
      this.isMapLoaded = false;
      this.mapInstance.setStyle(newStyleUrl);
    }
  }

  public async initialize(options: MapOptions): Promise<void> {
    if (typeof window === "undefined") return;

    // Dynamically import MapLibre GL to ensure zero SSR issues
    const maplibreModule = await import("maplibre-gl");
    const maplibregl = (maplibreModule as any).default || maplibreModule;

    if (options.center) {
      this.currentCenter = options.center;
    }
    if (options.zoom !== undefined) {
      this.currentZoom = options.zoom;
    }
    if (options.pitch !== undefined) {
      this.currentPitch = options.pitch;
    }
    if (options.bearing !== undefined) {
      this.currentBearing = options.bearing;
    }

    const container =
      typeof options.container === "string"
        ? (document.getElementById(options.container) as HTMLElement)
        : options.container;

    if (!container) return;

    // Clean up any existing map instance on container to avoid WebGL context leaks
    if (this.mapInstance) {
      this.destroy();
    }

    const effectiveStyle = options.styleUrl || this.styleUrl;

    try {
      this.mapInstance = new maplibregl.Map({
        container,
        style: effectiveStyle,
        // MapLibre expects [longitude, latitude]
        center: [this.currentCenter.longitude, this.currentCenter.latitude],
        zoom: this.currentZoom,
        pitch: this.currentPitch,
        bearing: this.currentBearing,
        minZoom: options.minZoom ?? 3,
        maxZoom: options.maxZoom ?? 19,
        interactive: options.interactive ?? true,
        attributionControl: true,
      });

      // Add MapLibre standard NavigationControl (Zoom + Rotation + Pitch Compass)
      const navControl = new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true,
      });
      this.mapInstance.addControl(navControl, "top-right");

      // Track camera position
      this.mapInstance.on("move", () => {
        if (!this.mapInstance) return;
        const center = this.mapInstance.getCenter();
        this.currentCenter = { latitude: center.lat, longitude: center.lng };
        this.currentZoom = this.mapInstance.getZoom();
        this.currentPitch = this.mapInstance.getPitch();
        this.currentBearing = this.mapInstance.getBearing();
      });

      // Handle map load event
      this.mapInstance.on("load", () => {
        this.isMapLoaded = true;

        // Ensure 3D building extrusion layer is configured
        this.setup3DBuildings();

        // Render any pending markers queued before map load
        this.flushPendingMarkers();

        // Force a resize calculation to ensure canvas fits container dimensions
        this.mapInstance.resize();

        if (options.onLoad) {
          options.onLoad();
        }
      });

      // Listen for style errors and tile errors
      this.mapInstance.on("error", (e: any) => {
        console.error("[MapLibre Error]", e?.error || e);
        if (options.onError && e?.error) {
          options.onError(e.error);
        }
      });
    } catch (err: any) {
      console.error("[MapLibre Init Exception]", err);
      if (options.onError) {
        options.onError(err);
      }
    }
  }

  /**
   * Configures 3D building extrusion layer if vector tile source is present
   */
  private setup3DBuildings(): void {
    if (!this.mapInstance) return;

    try {
      // Check if openmaptiles vector source is present and 3d layer not already in style
      if (
        this.mapInstance.getSource("openmaptiles") &&
        !this.mapInstance.getLayer("3d-buildings") &&
        !this.mapInstance.getLayer("building-3d")
      ) {
        this.mapInstance.addLayer({
          id: "3d-buildings",
          source: "openmaptiles",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "render_height"],
              0,
              "#CBD5E1",
              50,
              "#94A3B8",
              100,
              "#64748B",
            ],
            "fill-extrusion-height": [
              "coalesce",
              ["get", "render_height"],
              ["get", "height"],
              12,
            ],
            "fill-extrusion-base": [
              "coalesce",
              ["get", "render_min_height"],
              ["get", "min_height"],
              0,
            ],
            "fill-extrusion-opacity": 0.85,
          },
        });
      }
    } catch (err) {
      console.warn("[MapLibre 3D Buildings]", err);
    }
  }

  public setCenter(center: GeoCoordinate, zoom?: number, duration = 1000): void {
    this.currentCenter = center;
    if (zoom !== undefined) this.currentZoom = zoom;

    if (this.mapInstance) {
      this.mapInstance.flyTo({
        center: [center.longitude, center.latitude],
        zoom: zoom !== undefined ? zoom : this.mapInstance.getZoom(),
        duration,
        essential: true,
      });
    }
  }

  public getCenter(): GeoCoordinate {
    if (this.mapInstance) {
      const center = this.mapInstance.getCenter();
      return { latitude: center.lat, longitude: center.lng };
    }
    return this.currentCenter;
  }

  public setZoom(zoom: number, duration = 800): void {
    this.currentZoom = zoom;
    if (this.mapInstance) {
      this.mapInstance.easeTo({ zoom, duration });
    }
  }

  public getZoom(): number {
    if (this.mapInstance) {
      return this.mapInstance.getZoom();
    }
    return this.currentZoom;
  }

  public setPitch(pitch: number, duration = 1000): void {
    this.currentPitch = pitch;
    if (this.mapInstance) {
      this.mapInstance.easeTo({ pitch, duration });
    }
  }

  public getPitch(): number {
    if (this.mapInstance) {
      return this.mapInstance.getPitch();
    }
    return this.currentPitch;
  }

  public setBearing(bearing: number, duration = 800): void {
    this.currentBearing = bearing;
    if (this.mapInstance) {
      this.mapInstance.easeTo({ bearing, duration });
    }
  }

  public getBearing(): number {
    if (this.mapInstance) {
      return this.mapInstance.getBearing();
    }
    return this.currentBearing;
  }

  public set2DView(duration = 1000): void {
    this.currentPitch = 0;
    this.currentBearing = 0;
    if (this.mapInstance) {
      this.mapInstance.easeTo({ pitch: 0, bearing: 0, duration });
    }
  }

  public set3DView(pitch = 60, bearing = -20, duration = 1200): void {
    this.currentPitch = pitch;
    this.currentBearing = bearing;
    if (this.mapInstance) {
      this.mapInstance.easeTo({ pitch, bearing, duration });
    }
  }

  public getViewMode(): MapViewMode {
    return this.getPitch() > 15 ? "3d" : "2d";
  }

  public resize(): void {
    if (this.mapInstance) {
      this.mapInstance.resize();
    }
  }

  public async addMarker(descriptor: MapMarkerDescriptor): Promise<void> {
    if (!this.mapInstance) {
      this.pendingMarkers.push(descriptor);
      return;
    }

    if (typeof window === "undefined") return;
    const maplibreModule = await import("maplibre-gl");
    const maplibregl = (maplibreModule as any).default || maplibreModule;

    this.removeMarker(descriptor.id);

    let markerElement: HTMLElement;
    if (descriptor.element) {
      markerElement = descriptor.element;
    } else {
      markerElement = document.createElement("div");
      markerElement.className =
        "w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-white font-bold ring-2 ring-white cursor-pointer transition-transform hover:scale-110";
      markerElement.style.backgroundColor = descriptor.color || "#0E6B38";
      markerElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;
    }

    if (descriptor.onClick) {
      markerElement.addEventListener("click", descriptor.onClick);
    }

    const marker = new maplibregl.Marker({ element: markerElement })
      .setLngLat([descriptor.coordinates.longitude, descriptor.coordinates.latitude]);

    if (descriptor.popupHtml) {
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(descriptor.popupHtml);
      marker.setPopup(popup);
    }

    marker.addTo(this.mapInstance);
    this.markersMap.set(descriptor.id, marker);
  }

  private flushPendingMarkers(): void {
    if (this.pendingMarkers.length > 0) {
      const list = [...this.pendingMarkers];
      this.pendingMarkers = [];
      list.forEach((m) => this.addMarker(m));
    }
  }

  public removeMarker(markerId: string): void {
    const existing = this.markersMap.get(markerId);
    if (existing) {
      existing.remove();
      this.markersMap.delete(markerId);
    }
  }

  public clearMarkers(): void {
    this.markersMap.forEach((marker) => marker.remove());
    this.markersMap.clear();
    this.pendingMarkers = [];
  }

  public async addUserLocationMarker(coordinates: GeoCoordinate): Promise<void> {
    if (!this.mapInstance || typeof window === "undefined") return;

    const maplibreModule = await import("maplibre-gl");
    const maplibregl = (maplibreModule as any).default || maplibreModule;

    this.removeUserLocationMarker();

    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center select-none pointer-events-none";
    el.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-blue-500/20 animate-ping absolute"></div>
      <div class="w-4 h-4 rounded-full bg-blue-600 ring-2 ring-white shadow-lg relative z-10"></div>
    `;

    this.userLocationMarker = new maplibregl.Marker({ element: el })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .addTo(this.mapInstance);
  }

  public removeUserLocationMarker(): void {
    if (this.userLocationMarker) {
      this.userLocationMarker.remove();
      this.userLocationMarker = null;
    }
  }

  public fitBounds(bounds: [GeoCoordinate, GeoCoordinate], padding = 50): void {
    if (this.mapInstance) {
      const [sw, ne] = bounds;
      this.mapInstance.fitBounds(
        [
          [sw.longitude, sw.latitude],
          [ne.longitude, ne.latitude],
        ],
        { padding, maxZoom: 16, duration: 1000 }
      );
    }
  }

  public destroy(): void {
    this.clearMarkers();
    this.removeUserLocationMarker();
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
    this.isMapLoaded = false;
  }
}
