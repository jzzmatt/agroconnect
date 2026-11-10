import {
  LayoutDashboard,
  User,
  GraduationCap,
  ShoppingBag,
  ClipboardList,
  Bell,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type { UserRoleType } from "@/types/database";
import type { Permission } from "@/lib/authorization";
import { pt, type Dictionary } from "@/i18n/dictionaries/pt";

export interface NavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
  requiredRole?: UserRoleType;
  requiredModule?: "agriShopping" | "agriAcademy" | "agriExpert" | "agriLocalizacao";
  /** When set, item is locked unless the user has this capability. */
  requiredPermission?: Permission;
  /** When true, subscription/module lock never applies (e.g. student My Courses). */
  neverLock?: boolean;
  /** Visual nested items. Groups have children and no destination href. */
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  pillar?: "agriExpert" | "agriAcademy" | "agriShopping" | "agriLocalizacao" | "general";
  roles?: UserRoleType[];
  requiredModule?: "agriShopping" | "agriAcademy" | "agriExpert" | "agriLocalizacao";
  items: NavItem[];
}

export function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

export function getDashboardNavigation(dict: Dictionary): NavSection[] {
  return [
    {
      title: "",
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
        {
          title: dict.navDash.createService,
          href: "/dashboard/services/new",
          icon: ClipboardList,
          requiredPermission: "service.manage",
        },
        {
          title: dict.navDash.createCourse,
          href: "/dashboard/academy",
          icon: GraduationCap,
          requiredPermission: "academy.course.create",
        },
        {
          title: dict.navDash.createProduct,
          href: "/dashboard/products/new",
          icon: ShoppingBag,
          requiredPermission: "product.create",
        },
        {
          title: dict.navDash.whatsappSetup,
          href: "/dashboard/whatsapp",
          icon: MessageCircle,
          requiredPermission: "whatsapp.connect",
        },
        {
          title: dict.navDash.notificationCenter,
          href: "/dashboard/notifications",
          icon: Bell,
        },
      ],
    },
  ];
}

export const DASHBOARD_NAVIGATION = getDashboardNavigation(pt);
