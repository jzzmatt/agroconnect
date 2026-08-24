// @vitest-environment jsdom
/**
 * Guards the "Map container is already initialized" regression.
 *
 * Leaflet stamps `_leaflet_id` on a container and throws if `L.map()` is called
 * on it again. The mock below reproduces exactly that contract, so these tests
 * fail if the provider ever initializes twice against a live container.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const ALREADY_INITIALIZED = "Map container is already initialized.";

let mapsCreated = 0;
let mapsRemoved = 0;

function createLeafletMock() {
  return {
    default: {
      map: (container: HTMLElement) => {
        if ((container as any)._leaflet_id != null) {
          throw new Error(ALREADY_INITIALIZED);
        }
        (container as any)._leaflet_id = ++mapsCreated;

        const handlers: Record<string, () => void> = {};
        return {
          on: (event: string, handler: () => void) => {
            handlers[event] = handler;
          },
          remove: () => {
            mapsRemoved += 1;
            delete (container as any)._leaflet_id;
          },
          invalidateSize: () => undefined,
          getCenter: () => ({ lat: -12.5, lng: 17.5 }),
          getZoom: () => 6,
          setView: () => undefined,
          flyTo: () => undefined,
          setZoom: () => undefined,
          removeLayer: () => undefined,
          fitBounds: () => undefined,
        };
      },
      tileLayer: () => ({
        addTo: () => ({ on: () => undefined }),
        on: () => undefined,
      }),
      divIcon: () => ({}),
      marker: () => ({
        addTo: () => undefined,
        bindPopup: () => undefined,
        on: () => undefined,
      }),
    },
  };
}

vi.mock("leaflet", () => createLeafletMock());

async function loadProvider() {
  const { MapQuestProvider } = await import("@/lib/location/providers/mapquest-map");
  return MapQuestProvider;
}

describe("MapQuest container lifecycle", () => {
  beforeEach(() => {
    mapsCreated = 0;
    mapsRemoved = 0;
    document.body.innerHTML = "";
  });

  it("initializes a container once and releases it on destroy", async () => {
    const MapQuestProvider = await loadProvider();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const provider = new MapQuestProvider("test-key");
    await provider.initialize({ container });
    expect(mapsCreated).toBe(1);
    expect((container as any)._leaflet_id).toBeDefined();

    provider.destroy();
    expect(mapsRemoved).toBe(1);
    // Released, so the node can be initialized again.
    expect((container as any)._leaflet_id).toBeUndefined();
  });

  it("reuses the same container across a remount without throwing", async () => {
    const MapQuestProvider = await loadProvider();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const first = new MapQuestProvider("test-key");
    await first.initialize({ container });
    first.destroy();

    const second = new MapQuestProvider("test-key");
    await expect(second.initialize({ container })).resolves.toBeUndefined();
    expect(mapsCreated).toBe(2);
    second.destroy();
  });

  it("survives a destroy that races the awaited Leaflet import", async () => {
    // Reproduces React Strict Mode: mount, cleanup, mount again, all before the
    // first initialize() resolves. This previously created a map after teardown
    // and the second mount threw "Map container is already initialized".
    const MapQuestProvider = await loadProvider();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const first = new MapQuestProvider("test-key");
    const firstInit = first.initialize({ container });
    first.destroy(); // cleanup lands while the import is still pending

    const second = new MapQuestProvider("test-key");
    const secondInit = second.initialize({ container });

    await expect(Promise.all([firstInit, secondInit])).resolves.toBeDefined();

    // Exactly one live map remains, owned by the second provider.
    expect((container as any)._leaflet_id).toBeDefined();
    second.destroy();
    expect((container as any)._leaflet_id).toBeUndefined();
  });

  it("recovers a container abandoned without cleanup", async () => {
    const MapQuestProvider = await loadProvider();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const orphan = new MapQuestProvider("test-key");
    await orphan.initialize({ container });
    // Simulates a lost instance (hot reload) that never ran destroy().

    const next = new MapQuestProvider("test-key");
    await expect(next.initialize({ container })).resolves.toBeUndefined();
    expect((container as any)._leaflet_id).toBeDefined();
    next.destroy();
  });

  it("changing centre or zoom moves the camera instead of rebuilding", async () => {
    const MapQuestProvider = await loadProvider();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const provider = new MapQuestProvider("test-key");
    await provider.initialize({ container, center: { latitude: -12.5, longitude: 17.5 }, zoom: 6 });
    expect(mapsCreated).toBe(1);

    provider.setCenter({ latitude: -8.83, longitude: 13.24 }, 13);
    provider.setZoom(15);

    // No additional map was constructed.
    expect(mapsCreated).toBe(1);
    provider.destroy();
  });
});
