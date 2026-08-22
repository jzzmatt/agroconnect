import type {
  ProfessionalTitle,
  ProfileType,
  SubscriptionPlan,
  UserRoleType,
} from "@/types/database";
import type { UserProfileWithRoles, UserEntitlements, UserGreetingResult } from "@/types/domain";

/**
 * Portuguese Profile Type Mapping & Visual Metadata
 */
export const PROFILE_TYPE_CONFIG: Record<
  ProfileType,
  {
    label: string;
    description: string;
    icon: string;
    badgeColor: string;
    roleKey: UserRoleType;
  }
> = {
  veterinarian: {
    label: "Veterinário",
    description: "Sanidade animal, vacinação e medicina pecuária",
    icon: "🩺",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    roleKey: "veterinarian",
  },
  expert: {
    label: "Especialista",
    description: "Agronomia, fitossanidade e consultoria de solos",
    icon: "🧠",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    roleKey: "expert",
  },
  instructor: {
    label: "Instrutor",
    description: "Ensino, formação prática e tutoria AgriAcademy",
    icon: "🎓",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    roleKey: "instructor",
  },
  student: {
    label: "Estudante",
    description: "Aprendizagem contínua e cursos agrícolas",
    icon: "📚",
    badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    roleKey: "student",
  },
  seller: {
    label: "Vendedor",
    description: "Comercialização de insumos e máquinas no AgriShopping",
    icon: "🛒",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    roleKey: "seller",
  },
  farmer: {
    label: "Produtor Agrícola",
    description: "Produção de colheitas e exploração agropecuária",
    icon: "🌾",
    badgeColor: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300",
    roleKey: "farmer",
  },
  service_provider: {
    label: "Prestador de Serviços",
    description: "Mecanização, aluguer de alfaias e serviços no campo",
    icon: "🚜",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    roleKey: "service_provider",
  },
  business: {
    label: "Empresarial",
    description: "Empresas agroindustriais e cooperativas",
    icon: "🏢",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
    roleKey: "business",
  },
  personal: {
    label: "Pessoal",
    description: "Utilizador geral do ecossistema",
    icon: "👤",
    badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    roleKey: "student",
  },
};

/**
 * 1. Name Resolution Strategy
 * Priority:
 * 1. User-defined display_name
 * 2. first_name + last_name
 * 3. username
 * 4. email local-part (e.g. "mateus" from "mateus@example.com")
 * 5. Fallback "Utilizador"
 */
export function resolveDisplayName(params: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  if (params.displayName && params.displayName.trim().length > 0) {
    return params.displayName.trim();
  }

  if (params.firstName && params.firstName.trim().length > 0) {
    const full = `${params.firstName.trim()} ${params.lastName?.trim() || ""}`.trim();
    return full;
  }

  if (params.username && params.username.trim().length > 0) {
    return params.username.trim();
  }

  if (params.email && params.email.includes("@")) {
    const localPart = params.email.split("@")[0].trim();
    if (localPart.length > 0) {
      return localPart;
    }
  }

  return "Utilizador";
}

/**
 * 2. Professional Title Formatter
 * Priority:
 * 1. Explicit user-configured title ('Dr.', 'Prof.', 'Eng.', 'Tec.', custom)
 * 2. Active profile type dynamic title ('Dr.' for veterinarian, 'Instrutor' for instructor, etc.)
 */
export function resolveEffectiveTitle(params: {
  professionalTitle?: ProfessionalTitle | null;
  professionalTitleCustom?: string | null;
  activeProfile?: ProfileType | null;
}): string {
  // If explicitly configured
  if (params.professionalTitle && params.professionalTitle !== "none") {
    if (params.professionalTitle === "custom" && params.professionalTitleCustom) {
      return params.professionalTitleCustom.trim();
    }
    return params.professionalTitle;
  }

  // Dynamic derivation based on active profile type
  if (params.activeProfile === "veterinarian") {
    return "Dr.";
  }
  if (params.activeProfile === "instructor") {
    return "Instrutor";
  }
  if (params.activeProfile === "expert") {
    return "Especialista";
  }

  return "";
}

/**
 * 3. Hero Greeting Builder
 * Generates clean greeting: "Olá, Dr. Mateus", "Olá, Instrutor João", "Olá, AgroFarm Angola"
 * NEVER generates "Olá, Dr. me@example.com"
 */
export function getUserGreeting(params: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  professionalTitle?: ProfessionalTitle | null;
  professionalTitleCustom?: string | null;
  activeProfile?: ProfileType | null;
}): UserGreetingResult {
  let resolvedName = resolveDisplayName({
    displayName: params.displayName,
    firstName: params.firstName,
    lastName: params.lastName,
    username: params.username,
    email: params.email,
  });

  const effectiveTitle = resolveEffectiveTitle({
    professionalTitle: params.professionalTitle,
    professionalTitleCustom: params.professionalTitleCustom,
    activeProfile: params.activeProfile,
  });

  const activeProfileKey = params.activeProfile || "personal";
  const profileConfig = PROFILE_TYPE_CONFIG[activeProfileKey] || PROFILE_TYPE_CONFIG.personal;

  if (effectiveTitle && effectiveTitle !== "none") {
    const titleClean = effectiveTitle.trim();
    const titleRegex = new RegExp(`^${titleClean}\\.?\\s*`, "i");
    if (titleRegex.test(resolvedName)) {
      resolvedName = resolvedName.replace(titleRegex, "").trim();
    }
    if (/^(Dr|Prof|Eng|Tec)\.?\s+/i.test(resolvedName)) {
      resolvedName = resolvedName.replace(/^(Dr|Prof|Eng|Tec)\.?\s+/i, "").trim();
    }
  }

  const fullNameOrTitle = effectiveTitle ? `${effectiveTitle} ${resolvedName}` : resolvedName;

  return {
    greeting: `Olá, ${fullNameOrTitle}`,
    fullNameOrTitle,
    displayName: resolvedName,
    activeProfileLabel: profileConfig.label,
    activeProfileIcon: profileConfig.icon,
  };
}

import { getUserEntitlements } from "@/lib/services/pricing-service";

/**
 * 4. Subscription & Entitlements Engine
 * Evaluates capabilities based on subscription plan & profile capabilities
 */
export function calculateEntitlements(params: {
  subscriptionPlan?: SubscriptionPlan | string | null;
  roles?: UserRoleType[];
  accountType?: string;
  activeProductCount?: number;
}): UserEntitlements {
  return getUserEntitlements(params);
}

/**
 * 5. Available Profiles Discovery
 * Extracts all distinct profile contexts available to this user
 */
export function getAvailableProfileTypes(profile: UserProfileWithRoles): ProfileType[] {
  const available: ProfileType[] = [];

  const roleSet = new Set(profile.roles);

  if (roleSet.has("veterinarian")) available.push("veterinarian");
  if (roleSet.has("expert") || roleSet.has("agronomist") || roleSet.has("agricultural_consultant")) available.push("expert");
  if (roleSet.has("instructor")) available.push("instructor");
  if (roleSet.has("seller")) available.push("seller");
  if (roleSet.has("farmer")) available.push("farmer");
  if (roleSet.has("service_provider")) available.push("service_provider");
  if (roleSet.has("business")) available.push("business");
  if (roleSet.has("student")) available.push("student");

  if (available.length === 0) {
    available.push("personal");
  }

  return available;
}
