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
  Store,
  Package,
  Truck,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { UserRoleType } from "@/types/database";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  requiredRole?: UserRoleType;
  requiredModule?: "agriShopping" | "agriAcademy" | "agriExpert" | "agriLocalizacao";
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
    requiredModule: "agriExpert",
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
    requiredModule: "agriAcademy",
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
    title: "AgriShopping & Vendas",
    pillar: "agriShopping",
    requiredModule: "agriShopping",
    roles: ["seller", "farmer", "business", "expert"],
    items: [
      {
        title: "Meus Produtos",
        href: "/dashboard/products",
        icon: ShoppingBag,
      },
      {
        title: "Encomendas Recebidas",
        href: "/dashboard/orders",
        icon: Package,
      },
      {
        title: "Logística & Entregas",
        href: "/dashboard/logistics",
        icon: Truck,
        badge: "Fulfillment",
      },
      {
        title: "Notificações",
        href: "/dashboard/notifications",
        icon: Bell,
      },
      {
        title: "Pedidos de Cotação",
        href: "/dashboard/product-requests",
        icon: Calendar,
      },
      {
        title: "Explorar Loja",
        href: "/agrishopping",
        icon: Store,
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
