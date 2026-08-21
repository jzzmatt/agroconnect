import type {
  IMapProvider,
  MapOptions,
  MapMarkerDescriptor,
} from "./types";
import type { GeoCoordinate } from "@/types/domain";

/**
 * OpenFreeMap standard style endpoints.
 * Styles: 'liberty' (clean, modern), 'positron' (light minimal), 'bright' (high contrast)
 */
export const OPEN_FREE_MAP_STYLES = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
  bright: "https://tiles.openfreemap.org/styles/bright",
} as const;

export type OpenFreeMapStyleName = keyof typeof OPEN_FREE_MAP_STYLES;

/**
 * MapLibre + OpenFreeMap implementation of IMapProvider.
 * Provides vector tile map rendering, high-performance canvas, custom markers, and smooth camera controls.
 */
export class MapLibreOpenFreeMapProvider implements IMapProvider {
  public readonly id = "maplibre-openfreemap";
  public readonly name = "OpenFreeMap (MapLibre GL)";

  private mapInstance: any = null;
  private markersMap: Map<string, any> = new Map();
  private styleUrl: string;
  private currentCenter: GeoCoordinate;
  private currentZoom: number;

  constructor(style: OpenFreeMapStyleName | string = "liberty") {
    this.styleUrl =
      style in OPEN_FREE_MAP_STYLES
        ? OPEN_FREE_MAP_STYLES[style as OpenFreeMapStyleName]
        : style;
    this.currentCenter = { latitude: -12.5, longitude: 17.5 }; // Default Angola center
    this.currentZoom = 6;
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

    const container =
      typeof options.container === "string"
        ? (document.getElementById(options.container) as HTMLElement)
        : options.container;

    if (!container) return;

    this.mapInstance = new maplibregl.Map({
      container,
      style: options.styleUrl || this.styleUrl,
      center: [this.currentCenter.longitude, this.currentCenter.latitude],
      zoom: this.currentZoom,
      minZoom: options.minZoom ?? 3,
      maxZoom: options.maxZoom ?? 18,
      interactive: options.interactive ?? true,
    });

    this.mapInstance.on("move", () => {
      if (!this.mapInstance) return;
      const center = this.mapInstance.getCenter();
      this.currentCenter = { latitude: center.lat, longitude: center.lng };
      this.currentZoom = this.mapInstance.getZoom();
    });
  }

  public setCenter(center: GeoCoordinate, zoom?: number): void {
    this.currentCenter = center;
    if (zoom !== undefined) this.currentZoom = zoom;

    if (this.mapInstance) {
      this.mapInstance.flyTo({
        center: [center.longitude, center.latitude],
        zoom: zoom !== undefined ? zoom : this.mapInstance.getZoom(),
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

  public setZoom(zoom: number): void {
    this.currentZoom = zoom;
    if (this.mapInstance) {
      this.mapInstance.setZoom(zoom);
    }
  }

  public getZoom(): number {
    if (this.mapInstance) {
      return this.mapInstance.getZoom();
    }
    return this.currentZoom;
  }

  public async addMarker(descriptor: MapMarkerDescriptor): Promise<void> {
    if (typeof window === "undefined") return;
    const maplibreModule = await import("maplibre-gl");
    const maplibregl = (maplibreModule as any).default || maplibreModule;

    if (!this.mapInstance) return;

    this.removeMarker(descriptor.id);

    let markerElement: HTMLElement;
    if (descriptor.element) {
      markerElement = descriptor.element;
    } else {
      // Default branded marker element
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
  }

  public fitBounds(bounds: [GeoCoordinate, GeoCoordinate], padding = 40): void {
    if (this.mapInstance) {
      const [sw, ne] = bounds;
      this.mapInstance.fitBounds(
        [
          [sw.longitude, sw.latitude],
          [ne.longitude, ne.latitude],
        ],
        { padding }
      );
    }
  }

  public destroy(): void {
    this.clearMarkers();
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }
}
