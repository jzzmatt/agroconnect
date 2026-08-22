import {
  LayoutDashboard,
  User,
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  Calendar,
  BookOpen,
  DollarSign,
  Award,
  Star,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { UserRoleType } from "@/types/database";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  requiredRole?: UserRoleType;
}

export interface NavSection {
  title: string;
  pillar?: "agriExpert" | "agriAcademy" | "agriShopping" | "agriLocalizacao" | "general";
  roles?: UserRoleType[];
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
 *   - Meus Cursos
 *   - Estudantes
 */
export const DASHBOARD_NAVIGATION: NavSection[] = [
  {
    title: "Principal",
    pillar: "general",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Meu Perfil",
        href: "/profile",
        icon: User,
      },
    ],
  },
  {
    title: "AgriExpert",
    pillar: "agriExpert",
    roles: ["expert", "veterinarian", "agronomist", "agricultural_consultant"],
    items: [
      {
        title: "Meus Serviços",
        href: "/dashboard/services",
        icon: ClipboardList,
      },
      {
        title: "Pedidos de Serviço",
        href: "/dashboard/requests",
        icon: Calendar,
      },
      {
        title: "Avaliações",
        href: "/dashboard/expert/reviews",
        icon: Star,
      },
      {
        title: "Ganhos",
        href: "/dashboard/expert/earnings",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "AgriAcademy",
    pillar: "agriAcademy",
    roles: ["instructor", "student"],
    items: [
      {
        title: "Meus Cursos",
        href: "/dashboard/academy/my-courses",
        icon: BookOpen,
      },
      {
        title: "Estudantes",
        href: "/dashboard/academy/students",
        icon: Users,
      },
    ],
  },
  {
    title: "AgriShopping & Recursos",
    pillar: "agriShopping",
    items: [
      {
        title: "AgriShopping",
        href: "/agrishopping",
        icon: ShoppingBag,
      },
      {
        title: "AgriLocalização",
        href: "/agrilocalizacao",
        icon: MapPin,
        badge: "Mapa",
      },
    ],
  },
];
