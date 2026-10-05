/**
 * Illustrated Angola agricultural atlas.
 * Visual language follows the warm cultural-map reference: forest ground,
 * earthy provinces, cream tags, orange selection. Geography stays vector.
 */

export const ANGOLA_MAP_BACKGROUND = {
  dark: {
    top: "#063A30",
    center: "#064A38",
    bottom: "#05382E",
    solid: "#063F32",
  },
  light: {
    surround: "#F8F3E8",
  },
} as const;

/** Distinguishable earthy fills. Neighbours do not share a colour. */
export const ATLAS_PROVINCE_FILLS: Record<string, string> = {
  BGO: "#3E7130",
  BGU: "#718333",
  BIE: "#C49A32",
  CAB: "#A18B2F",
  CUA: "#D9B13C",
  CNO: "#B95E45",
  CUS: "#E87557",
  CUB: "#A84D42",
  CNN: "#D97735",
  HUA: "#68732D",
  HUI: "#3E7130",
  IEB: "#D9B13C",
  LUA: "#D97735",
  LNO: "#A18B2F",
  LSU: "#718333",
  MAL: "#68732D",
  MOX: "#A84D42",
  MXL: "#C49A32",
  NAM: "#B95E45",
  UIG: "#E87557",
  ZAI: "#718333",
};

export const PROVINCE_LABEL_STYLE = {
  background: "#F5D98A",
  text: "#4B4A20",
  border: "#C9A84B",
  shadow: "0 2px 4px rgba(0,0,0,0.20)",
} as const;

export const PROVINCE_INTERACTION_COLORS = {
  hover: "#E87551",
  selected: "#F97316",
  active: "#FF6B45",
  selectedGlow: "rgba(249,115,22,0.35)",
  boundary: "#F3E2A8",
  coastline: "#B58E36",
} as const;

export const AGRICULTURAL_MARKER_COLORS = {
  products: "#D4A72C",
  farmers: "#3E7130",
  farms: "#718333",
  services: "#E87557",
  marketplace: "#D4A72C",
  academy: "#8B4513",
  expert: "#3E7130",
  business: "#B95E45",
  selected: "#F97316",
} as const;

export function atlasProvinceFill(code: string): string {
  return ATLAS_PROVINCE_FILLS[code] ?? "#718333";
}
