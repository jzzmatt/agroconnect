import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  Calendar,
  BookOpen,
  Video,
  Award,
  Package,
  ClipboardList,
  Boxes,
  Building2,
  Settings,
  User,
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

export const DASHBOARD_NAVIGATION: NavSection[] = [
  {
    title: "Geral",
    pillar: "general",
    items: [
      {
        title: "Painel Principal",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "AgriLocalização",
        href: "/agrilocalizacao",
        icon: MapPin,
        badge: "Mapa",
      },
    ],
  },
  {
    title: "AgriAcademy (Aluno)",
    pillar: "agriAcademy",
    roles: ["student"],
    items: [
      {
        title: "Meus Cursos",
        href: "/dashboard/academy/my-courses",
        icon: BookOpen,
      },
      {
        title: "Certificados",
        href: "/dashboard/academy/certificates",
        icon: Award,
      },
    ],
  },
  {
    title: "AgriAcademy (Instrutor)",
    pillar: "agriAcademy",
    roles: ["instructor"],
    items: [
      {
        title: "Gestão de Cursos",
        href: "/dashboard/academy/manage-courses",
        icon: GraduationCap,
      },
      {
        title: "Biblioteca de Vídeos",
        href: "/dashboard/academy/videos",
        icon: Video,
      },
      {
        title: "Meus Alunos",
        href: "/dashboard/academy/students",
        icon: Users,
      },
    ],
  },
  {
    title: "AgriExpert (Especialista)",
    pillar: "agriExpert",
    roles: ["expert", "veterinarian", "agronomist", "agricultural_consultant"],
    items: [
      {
        title: "Perfil Profissional",
        href: "/dashboard/expert/profile",
        icon: Users,
      },
      {
        title: "Serviços & Consultorias",
        href: "/dashboard/expert/services",
        icon: ClipboardList,
      },
      {
        title: "Agendamentos",
        href: "/dashboard/expert/appointments",
        icon: Calendar,
      },
    ],
  },
  {
    title: "AgriShopping (Vendedor)",
    pillar: "agriShopping",
    roles: ["seller"],
    items: [
      {
        title: "Meus Produtos",
        href: "/dashboard/shopping/products",
        icon: Package,
      },
      {
        title: "Pedidos Recebidos",
        href: "/dashboard/shopping/orders",
        icon: ShoppingBag,
      },
      {
        title: "Inventário",
        href: "/dashboard/shopping/inventory",
        icon: Boxes,
      },
    ],
  },
  {
    title: "Empresa Agrícola",
    pillar: "general",
    roles: ["business"],
    items: [
      {
        title: "Gestão da Empresa",
        href: "/dashboard/business",
        icon: Building2,
      },
    ],
  },
  {
    title: "Conta",
    pillar: "general",
    items: [
      {
        title: "Meu Perfil",
        href: "/profile",
        icon: User,
      },
      {
        title: "Definições",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
