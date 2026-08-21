import type {
  IMapProvider,
  MapOptions,
  MapMarkerDescriptor,
  MapLayerType,
} from "./types";
import type { GeoCoordinate } from "@/types/domain";

/**
 * Returns the appropriate tile URL based on layer type.
 * MapQuest supports official imagery tiles, OpenStreetMap base tiles, and ESRI World Imagery.
 */
export function getMapTileUrl(
  apiKey: string,
  layer: MapLayerType = "map"
): { url: string; attribution: string; subdomains?: string[] } {
  switch (layer) {
    case "satellite":
    case "hybrid":
      return {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community | Powered by MapQuest',
      };
    case "dark":
      return {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | MapQuest Engine',
        subdomains: ["a", "b", "c", "d"],
      };
    case "light":
      return {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | MapQuest Engine',
        subdomains: ["a", "b", "c", "d"],
      };
    case "map":
    default:
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | MapQuest Platform',
        subdomains: ["a", "b", "c"],
      };
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

  constructor(apiKey?: string, initialLayer: MapLayerType = "map") {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_MAPQUEST_API_KEY || "";
    // Default geographic center of Angola (near Huambo/Bié)
    this.currentCenter = { latitude: -12.5, longitude: 17.5 };
    this.currentZoom = 6;
    this.currentLayerType = initialLayer;
  }

  public async initialize(options: MapOptions): Promise<void> {
    if (typeof window === "undefined") return;

    // Dynamically import Leaflet
    const L = (await import("leaflet")).default;

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
    }

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

      // Apply initial tile layer
      this.applyTileLayer(L);

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
      subdomains: tileConfig.subdomains || ["a", "b", "c"],
      attribution: tileConfig.attribution,
    }).addTo(this.mapInstance);
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
    this.clearMarkers();
    this.removeUserLocationMarker();
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
    this.isMapLoaded = false;
  }
}
