/** Visual tokens for the AgroConnect Angola agricultural atlas (source-of-truth palette). */

export const ANGOLA_MAP_BACKGROUND = {
  dark: {
    top: "#063A30",
    center: "#064A38",
    bottom: "#05382E",
    solid: "#064E3B",
  },
  light: {
    surround: "#F8F3E8",
  },
} as const;

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
} as const;

export const PROVINCE_FILL_PALETTE = [
  "#3E7130",
  "#718333",
  "#68732D",
  "#A18B2F",
  "#C49A32",
  "#D9B13C",
  "#B95E45",
  "#A84D42",
  "#D97735",
  "#E87557",
  "#F5D98A",
  "#3E7130",
  "#718333",
  "#A18B2F",
  "#C49A32",
  "#68732D",
  "#B95E45",
  "#D97735",
  "#3E7130",
  "#718333",
  "#A84D42",
] as const;

export const AGRICULTURAL_MARKER_COLORS = {
  products: "#F97316",
  farmers: "#3E7130",
  farms: "#718333",
  services: "#E87557",
  marketplace: "#D4A72C",
  academy: "#8B4513",
} as const;
