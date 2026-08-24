import type {
  IMapProvider,
  MapOptions,
  MapMarkerDescriptor,
  MapLayerType,
} from "./types";
import type { GeoCoordinate } from "@/types/domain";

/**
 * Returns the official MapQuest raster tile configuration based on layer type.
 * MapQuest.js / MapQuest platform provides raster tiles under tiles.mapquest.com
 * with Vivid (standard map), Satellite (satellite imagery), Night (dark), and Grayscale (light).
 */
export function getMapTileUrl(
  apiKey?: string,
  layer: MapLayerType = "map"
): { url: string; attribution: string; subdomains: string[] } {
  const attribution =
    '&copy; <a href="https://www.mapquest.com" target="_blank">MapQuest</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
  const subdomains = ["a", "b", "c", "d"];
  const key = apiKey || process.env.NEXT_PUBLIC_MAPQUEST_API_KEY || "";
  const keyQuery = key ? `?key=${key}` : "";

  switch (layer) {
    case "satellite":
    case "hybrid":
      return {
        url: `https://{s}.tiles.mapquest.com/render/latest/satellite/{z}/{x}/{y}/256/png${keyQuery}`,
        attribution:
          '&copy; <a href="https://www.mapquest.com" target="_blank">MapQuest</a> &copy; DigitalGlobe &copy; USDA &copy; USGS',
        subdomains,
      };
    case "dark":
      return {
        url: `https://{s}.tiles.mapquest.com/render/latest/night/{z}/{x}/{y}/256/png${keyQuery}`,
        attribution,
        subdomains,
      };
    case "light":
      return {
        url: `https://{s}.tiles.mapquest.com/render/latest/grayscale/{z}/{x}/{y}/256/png${keyQuery}`,
        attribution,
        subdomains,
      };
    case "map":
    default:
      return {
        url: `https://{s}.tiles.mapquest.com/render/latest/vivid/{z}/{x}/{y}/256/png${keyQuery}`,
        attribution,
        subdomains,
      };
  }
}

/**
 * Leaflet stamps `_leaflet_id` on a container and refuses a second `L.map()`
 * call on it with "Map container is already initialized". Tracking the live map
 * per container lets a stale instance be torn down before reusing the node,
 * which is what happens when React remounts a component.
 */
const MAPS_BY_CONTAINER = new WeakMap<HTMLElement, any>();

function releaseContainer(container: HTMLElement | null | undefined): void {
  if (!container) return;
  const existing = MAPS_BY_CONTAINER.get(container);
  if (existing) {
    try {
      existing.remove();
    } catch {
      // Already detached; the container reset below is what matters.
    }
    MAPS_BY_CONTAINER.delete(container);
  }
  // Leaflet only checks this property, so clearing it makes the node reusable
  // even if the previous instance was lost.
  if ((container as any)._leaflet_id != null) {
    delete (container as any)._leaflet_id;
  }
}

/**
 * MapQuest Provider (Leaflet-based MapQuest SDK architecture)
 * Renders standard map, satellite, and dark styles with high-performance tile rendering,
 * custom markers, popups, and user GPS indicator.
 */
export class MapQuestProvider implements IMapProvider {
  public readonly id = "mapquest";
  public readonly name = "MapQuest Maps";

  private apiKey: string;
  private mapInstance: any = null;
  private currentTileLayer: any = null;
  private markersMap: Map<string, any> = new Map();
  private userLocationMarker: any = null;
  private currentCenter: GeoCoordinate;
  private currentZoom: number;
  private currentLayerType: MapLayerType;
  private isMapLoaded = false;
  private pendingMarkers: MapMarkerDescriptor[] = [];
  private container: HTMLElement | null = null;
  /**
   * `initialize` awaits the Leaflet import, so `destroy()` can land before the
   * map exists. Without this the map would be created after teardown and left
   * bound to the container, breaking the next initialization.
   */
  private disposed = false;

  constructor(apiKey?: string, initialLayer: MapLayerType = "map") {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_MAPQUEST_API_KEY || "";
    // Default geographic center of Angola (near Huambo/Bié)
    this.currentCenter = { latitude: -12.5, longitude: 17.5 };
    this.currentZoom = 6;
    this.currentLayerType = initialLayer;
  }

  public async initialize(options: MapOptions): Promise<void> {
    if (typeof window === "undefined") return;

    this.disposed = false;

    // Dynamically import Leaflet
    const L = (await import("leaflet")).default;

    // Torn down while the import was in flight: creating a map now would leak
    // an instance onto the container and block the next initialization.
    if (this.disposed) return;

    if (options.center) {
      this.currentCenter = options.center;
    }
    if (options.zoom !== undefined) {
      this.currentZoom = options.zoom;
    }
    if (options.layerType) {
      this.currentLayerType = options.layerType;
    }

    const container =
      typeof options.container === "string"
        ? (document.getElementById(options.container) as HTMLElement)
        : options.container;

    if (!container) return;

    if (this.mapInstance) {
      this.destroy();
      this.disposed = false;
    }

    // Drop any map still bound to this node (React remount, hot reload, or a
    // provider instance that was garbage collected without cleanup).
    releaseContainer(container);
    this.container = container;

    try {
      // Initialize Leaflet Map instance
      // Leaflet uses [latitude, longitude]
      this.mapInstance = L.map(container, {
        center: [this.currentCenter.latitude, this.currentCenter.longitude],
        zoom: this.currentZoom,
        minZoom: options.minZoom ?? 3,
        maxZoom: options.maxZoom ?? 18,
        zoomControl: options.interactive ?? true,
        attributionControl: true,
      });

      MAPS_BY_CONTAINER.set(container, this.mapInstance);

      // A teardown that raced this creation must not leave the map attached.
      if (this.disposed) {
        this.destroy();
        return;
      }

      // Apply initial tile layer
      this.applyTileLayer(L);

      // Invalidate size across multiple ticks to guarantee layout stabilization in React/Next.js
      setTimeout(() => {
        if (this.mapInstance) this.mapInstance.invalidateSize();
      }, 50);
      setTimeout(() => {
        if (this.mapInstance) this.mapInstance.invalidateSize();
      }, 300);
      setTimeout(() => {
        if (this.mapInstance) this.mapInstance.invalidateSize();
      }, 800);

      // Track camera changes
      this.mapInstance.on("moveend", () => {
        if (!this.mapInstance) return;
        const center = this.mapInstance.getCenter();
        this.currentCenter = { latitude: center.lat, longitude: center.lng };
        this.currentZoom = this.mapInstance.getZoom();
      });

      this.isMapLoaded = true;

      // Flush queued markers
      this.flushPendingMarkers();

      // Ensure dimensions fit
      this.resize();

      if (options.onLoad) {
        options.onLoad();
      }
    } catch (err: any) {
      console.error("[MapQuest Init Exception]", err);
      if (options.onError) {
        options.onError(err);
      }
    }
  }

  private applyTileLayer(L: any): void {
    if (!this.mapInstance) return;

    if (this.currentTileLayer) {
      this.mapInstance.removeLayer(this.currentTileLayer);
    }

    const tileConfig = getMapTileUrl(this.apiKey, this.currentLayerType);

    this.currentTileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: 18,
      subdomains: tileConfig.subdomains || ["a", "b", "c", "d"],
      attribution: tileConfig.attribution,
    }).addTo(this.mapInstance);

    // Attach tile error listener for developer diagnostics without exposing credentials
    this.currentTileLayer.on("tileerror", (errorEvent: any) => {
      console.warn(
        `[MapQuest Tile Error] Failed to load tile for layer "${this.currentLayerType}":`,
        errorEvent.coords
      );
    });
  }

  public setLayerType(layerType: MapLayerType): void {
    this.currentLayerType = layerType;
    if (this.mapInstance && typeof window !== "undefined") {
      import("leaflet").then((mod) => {
        const L = mod.default;
        this.applyTileLayer(L);
      });
    }
  }

  public getLayerType(): MapLayerType {
    return this.currentLayerType;
  }

  public setCenter(center: GeoCoordinate, zoom?: number, duration = 1000): void {
    this.currentCenter = center;
    if (zoom !== undefined) this.currentZoom = zoom;

    if (this.mapInstance) {
      const targetZoom = zoom !== undefined ? zoom : this.mapInstance.getZoom();
      if (duration > 0) {
        this.mapInstance.flyTo([center.latitude, center.longitude], targetZoom, {
          duration: duration / 1000,
        });
      } else {
        this.mapInstance.setView([center.latitude, center.longitude], targetZoom);
      }
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

  public resize(): void {
    if (this.mapInstance) {
      this.mapInstance.invalidateSize();
    }
  }

  public async addMarker(descriptor: MapMarkerDescriptor): Promise<void> {
    if (!this.mapInstance) {
      this.pendingMarkers.push(descriptor);
      return;
    }

    if (typeof window === "undefined") return;
    const L = (await import("leaflet")).default;

    this.removeMarker(descriptor.id);

    let customIcon: any;

    if (descriptor.element) {
      customIcon = L.divIcon({
        html: descriptor.element.outerHTML,
        className: "custom-mapquest-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    } else {
      const markerHtml = `
        <div style="background-color:${descriptor.color || "#0E6B38"}; width:32px; height:32px; border-radius:50%; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; border:2px solid #fff; cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;
      customIcon = L.divIcon({
        html: markerHtml,
        className: "mapquest-pin-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    }

    // Leaflet marker takes [latitude, longitude]
    const marker = L.marker([descriptor.coordinates.latitude, descriptor.coordinates.longitude], {
      icon: customIcon,
      title: descriptor.title,
    });

    if (descriptor.popupHtml) {
      marker.bindPopup(descriptor.popupHtml, { offset: [0, -10] });
    }

    if (descriptor.onClick) {
      marker.on("click", descriptor.onClick);
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
    if (existing && this.mapInstance) {
      this.mapInstance.removeLayer(existing);
      this.markersMap.delete(markerId);
    }
  }

  public clearMarkers(): void {
    if (this.mapInstance) {
      this.markersMap.forEach((marker) => this.mapInstance.removeLayer(marker));
    }
    this.markersMap.clear();
    this.pendingMarkers = [];
  }

  public async addUserLocationMarker(coordinates: GeoCoordinate): Promise<void> {
    if (!this.mapInstance || typeof window === "undefined") return;
    const L = (await import("leaflet")).default;

    this.removeUserLocationMarker();

    const gpsHtml = `
      <div style="position:relative; display:flex; align-items:center; justify-content:center;">
        <div style="width:28px; height:28px; border-radius:50%; background:rgba(37,99,235,0.25); animation:ping 1.5s infinite; position:absolute;"></div>
        <div style="width:16px; height:16px; border-radius:50%; background:#2563EB; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.35); position:relative; z-index:10;"></div>
      </div>
    `;

    const gpsIcon = L.divIcon({
      html: gpsHtml,
      className: "mapquest-user-gps-icon",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    this.userLocationMarker = L.marker([coordinates.latitude, coordinates.longitude], {
      icon: gpsIcon,
      zIndexOffset: 1000,
    }).addTo(this.mapInstance);
  }

  public removeUserLocationMarker(): void {
    if (this.userLocationMarker && this.mapInstance) {
      this.mapInstance.removeLayer(this.userLocationMarker);
      this.userLocationMarker = null;
    }
  }

  public fitBounds(bounds: [GeoCoordinate, GeoCoordinate], padding = 40): void {
    if (this.mapInstance) {
      const [sw, ne] = bounds;
      this.mapInstance.fitBounds(
        [
          [sw.latitude, sw.longitude],
          [ne.latitude, ne.longitude],
        ],
        { padding: [padding, padding], maxZoom: 16 }
      );
    }
  }

  public destroy(): void {
    this.disposed = true;
    this.clearMarkers();
    this.removeUserLocationMarker();

    const container = this.container;
    this.mapInstance = null;
    this.container = null;
    this.isMapLoaded = false;

    if (container) {
      // Single owner of teardown: removes the map bound to this node and clears
      // Leaflet's marker so the container can be initialized again.
      releaseContainer(container);
    }
  }
}
