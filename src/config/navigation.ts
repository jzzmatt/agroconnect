import {
  LayoutDashboard,
  User,
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  Calendar,
  BookOpenCheck,
  DollarSign,
  Award,
  Star,
  ClipboardList,
  Store,
  Package,
  Truck,
  Bell,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { UserRoleType } from "@/types/database";
import type { Permission } from "@/lib/authorization";
import { pt, type Dictionary } from "@/i18n/dictionaries/pt";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  requiredRole?: UserRoleType;
  requiredModule?: "agriShopping" | "agriAcademy" | "agriExpert" | "agriLocalizacao";
  /** When set, item is locked unless the user has this capability. */
  requiredPermission?: Permission;
  /** When true, subscription/module lock never applies (e.g. student My Courses). */
  neverLock?: boolean;
}

export interface NavSection {
  title: string;
  pillar?: "agriExpert" | "agriAcademy" | "agriShopping" | "agriLocalizacao" | "general";
  roles?: UserRoleType[];
  requiredModule?: "agriShopping" | "agriAcademy" | "agriExpert" | "agriLocalizacao";
  items: NavItem[];
}

/**
 * Dashboard Sidebar Structure matching Figma specification:
 * - Dashboard
 * - Meu Perfil
 * - AgriExpert
 *   - Meus Serviços
 *   - Agendamentos
 *   - Avaliações
 *   - Ganhos
 * - AgriAcademy
 *   - Course Creator
 *   - My Courses
 */
export function getDashboardNavigation(dict: Dictionary): NavSection[] {
  return [
  {
    title: dict.navDash.main,
    pillar: "general",
    items: [
      {
        title: dict.navDash.dashboard,
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: dict.navDash.myProfile,
        href: "/profile",
        icon: User,
      },
    ],
  },
  {
    title: "AgriExpert",
    pillar: "agriExpert",
    requiredModule: "agriExpert",
    roles: ["expert", "veterinarian", "agronomist", "agricultural_consultant"],
    items: [
      {
        title: dict.navDash.myServices,
        href: "/dashboard/services",
        icon: ClipboardList,
      },
      {
        title: dict.navDash.serviceRequests,
        href: "/dashboard/requests",
        icon: Calendar,
      },
      {
        title: dict.navDash.reviews,
        href: "/dashboard/expert/reviews",
        icon: Star,
      },
      {
        title: dict.navDash.earnings,
        href: "/dashboard/expert/earnings",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "AgriAcademy",
    pillar: "agriAcademy",
    requiredModule: "agriAcademy",
    roles: ["instructor", "student"],
    items: [
      {
        title: dict.navDash.courseCreator,
        href: "/dashboard/academy",
        icon: GraduationCap,
        requiredPermission: "academy.course.create",
      },
      {
        title: dict.navDash.myEnrolledCourses,
        href: "/dashboard/academy/my-courses",
        icon: BookOpenCheck,
        neverLock: true,
      },
    ],
  },
  {
    title: dict.navDash.agriProduct,
    pillar: "agriShopping",
    requiredModule: "agriShopping",
    items: [
      {
        title: dict.navDash.myProducts,
        href: "/dashboard/products",
        icon: ShoppingBag,
      },
      {
        title: dict.navDash.receivedOrders,
        href: "/dashboard/orders",
        icon: Package,
      },
      {
        title: dict.navDash.logistics,
        href: "/dashboard/logistics",
        icon: Truck,
        badge: "Fulfillment",
      },
      {
        title: dict.navDash.notifications,
        href: "/dashboard/notifications",
        icon: Bell,
      },
      {
        title: dict.navDash.quotes,
        href: "/dashboard/product-requests",
        icon: Calendar,
      },
      {
        title: dict.navDash.exploreStore,
        href: "/agrishopping",
        icon: Store,
      },
      {
        title: "AgriLocalização",
        href: "/agrilocalizacao",
        icon: MapPin,
        badge: dict.navDash.map,
      },
      {
        title: dict.navDash.enterprise,
        href: "/dashboard/enterprise",
        icon: Building2,
      },
    ],
  },
];
}

export const DASHBOARD_NAVIGATION = getDashboardNavigation(pt);
