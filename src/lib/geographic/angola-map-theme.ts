/**
 * Visual tokens matched to the Angola provinces reference map:
 * light canvas, Atlantic blue, saturated province fills, dark uppercase labels.
 * Interaction (selection, zoom, markers) stays independent of these fills.
 */

export const ANGOLA_MAP_BACKGROUND = {
  dark: {
    top: "#063A30",
    center: "#064A38",
    bottom: "#05382E",
    solid: "#064E3B",
  },
  light: {
    surround: "#E6E8EB",
    ocean: "#B9DFF5",
    neighbor: "#E4E6E9",
  },
} as const;

/** Reference political-map fills. New 2025 provinces use a sibling hue of their former parent. */
export const REFERENCE_PROVINCE_FILLS: Record<string, string> = {
  CAB: "#7E57C2",
  ZAI: "#43A047",
  UIG: "#FB8C00",
  LUA: "#E53935",
  IEB: "#FDD835",
  BGO: "#1E88E5",
  CNO: "#FBC02D",
  LNO: "#9575CD",
  MAL: "#00ACC1",
  CUS: "#5E35B1",
  LSU: "#FF9800",
  BGU: "#42A5F5",
  HUA: "#66BB6A",
  BIE: "#EF6A6A",
  MOX: "#9CCC65",
  MXL: "#C5E1A5",
  HUI: "#FF7043",
  NAM: "#26A69A",
  CUB: "#F9A825",
  CUA: "#FFE082",
  CNN: "#8E24AA",
};

export const PROVINCE_LABEL_STYLE = {
  name: "#2C333A",
  capital: "#4B5563",
  stroke: "#FFFFFF",
} as const;

export const PROVINCE_INTERACTION_COLORS = {
  hoverStroke: "#1F2937",
  selectedStroke: "#111827",
  selectedGlow: "rgba(17,24,39,0.28)",
} as const;

export const AGRICULTURAL_MARKER_COLORS = {
  products: "#F97316",
  farmers: "#3E7130",
  farms: "#718333",
  services: "#E87557",
  marketplace: "#D4A72C",
  academy: "#8B4513",
} as const;

export function referenceProvinceFill(code: string): string {
  return REFERENCE_PROVINCE_FILLS[code] ?? "#90A4AE";
}
