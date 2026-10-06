import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  GraduationCap,
  HandHelping,
  ShoppingBasket,
  Sprout,
  UserRound,
} from "lucide-react";
import type { MapMarkerItem } from "@/components/location/LocationMap";
import { AGRICULTURAL_MARKER_COLORS } from "@/lib/geographic/angola-map-theme";

export const MARKER_SIZE = {
  normal: 28,
  selected: 40,
} as const;

export const MARKER_CATEGORY_CONFIG: Record<
  MapMarkerItem["category"],
  { color: string; Icon: LucideIcon }
> = {
  shopping: { color: AGRICULTURAL_MARKER_COLORS.marketplace, Icon: ShoppingBasket },
  expert: { color: AGRICULTURAL_MARKER_COLORS.expert, Icon: UserRound },
  farm: { color: AGRICULTURAL_MARKER_COLORS.farms, Icon: Sprout },
  service: { color: AGRICULTURAL_MARKER_COLORS.services, Icon: HandHelping },
  business: { color: AGRICULTURAL_MARKER_COLORS.business, Icon: Briefcase },
  academy: { color: AGRICULTURAL_MARKER_COLORS.academy, Icon: GraduationCap },
};
