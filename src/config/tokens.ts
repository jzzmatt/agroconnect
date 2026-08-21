/**
 * AGROCONNECT Design Tokens
 * Source of Truth: AGROCONNECT — Product Design System & MVP (Figma)
 * Supports both LIGHT and DARK themes.
 */
export const TOKENS = {
  light: {
    colors: {
      background: "#FFFFFF",
      foreground: "#0F261B",
      surface: "#F8FAF9",
      surfaceElevated: "#FFFFFF",
      surfaceMuted: "#F1F5F3",
      surfaceCard: "#FFFFFF",
      cardForeground: "#0F261B",

      // Brand Greens
      primary: "#0E6B38",
      primaryForeground: "#FFFFFF",
      primaryHover: "#063A1D",
      secondary: "#E8F5EE",
      secondaryForeground: "#063A1D",

      // Muted & Borders
      muted: "#F1F5F3",
      mutedForeground: "#4A6355",
      border: "#E2EBE5",
      borderSubtle: "#EEF4F0",
      borderStrong: "#C3D6CB",
      ring: "#0E6B38",

      // Sidebar
      sidebar: "#FFFFFF",
      sidebarForeground: "#0F261B",
      sidebarBorder: "#E2EBE5",
      sidebarActive: "#0E6B38",
      sidebarActiveForeground: "#FFFFFF",

      // Input
      input: "#FFFFFF",
      inputBorder: "#E2EBE5",
      inputForeground: "#0F261B",

      // Semantic Status
      success: "#10B981",
      successForeground: "#FFFFFF",
      warning: "#F59E0B",
      warningForeground: "#FFFFFF",
      error: "#EF4444",
      errorForeground: "#FFFFFF",
      info: "#3B82F6",
      infoForeground: "#FFFFFF",

      // Pillar Themes
      expert: { primary: "#0E6B38", light: "#E8F5EE", border: "#C3D6CB", text: "#0E6B38" },
      academy: { primary: "#1D4ED8", light: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
      shopping: { primary: "#D97706", light: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
      localizacao: { primary: "#0D9488", light: "#F0FDFA", border: "#99F6E4", text: "#0F766E" },
    },
    shadows: {
      subtle: "0 1px 2px 0 rgba(14, 107, 56, 0.05)",
      card: "0 4px 6px -1px rgba(14, 107, 56, 0.08), 0 2px 4px -2px rgba(14, 107, 56, 0.05)",
      elevated: "0 10px 15px -3px rgba(14, 107, 56, 0.1), 0 4px 6px -4px rgba(14, 107, 56, 0.05)",
    },
  },
  dark: {
    colors: {
      background: "#08160E",       // Dedicated Figma dark forest background (not pure black)
      foreground: "#F1F5F3",       // Off-white readable text
      surface: "#0D2217",          // Elevated deep green surface
      surfaceElevated: "#122C1F",  // Distinct card background
      surfaceMuted: "#163626",
      surfaceCard: "#122C1F",
      cardForeground: "#F1F5F3",

      // Brand Greens (Vibrant in Dark Mode)
      primary: "#1B9C52",
      primaryForeground: "#FFFFFF",
      primaryHover: "#22C55E",
      secondary: "#163626",
      secondaryForeground: "#86EFAC",

      // Muted & Borders
      muted: "#163626",
      mutedForeground: "#94A89E",
      border: "#1E4431",
      borderSubtle: "#163626",
      borderStrong: "#2E6147",
      ring: "#1B9C52",

      // Sidebar
      sidebar: "#0D2217",
      sidebarForeground: "#F1F5F3",
      sidebarBorder: "#1E4431",
      sidebarActive: "#1B9C52",
      sidebarActiveForeground: "#FFFFFF",

      // Input
      input: "#0D2217",
      inputBorder: "#1E4431",
      inputForeground: "#F1F5F3",

      // Semantic Status
      success: "#10B981",
      successForeground: "#FFFFFF",
      warning: "#F59E0B",
      warningForeground: "#FFFFFF",
      error: "#EF4444",
      errorForeground: "#FFFFFF",
      info: "#3B82F6",
      infoForeground: "#FFFFFF",

      // Pillar Themes in Dark Mode
      expert: { primary: "#1B9C52", light: "#163626", border: "#2E6147", text: "#86EFAC" },
      academy: { primary: "#3B82F6", light: "#1E293B", border: "#334155", text: "#93C5FD" },
      shopping: { primary: "#F59E0B", light: "#2D2006", border: "#523B0F", text: "#FCD34D" },
      localizacao: { primary: "#14B8A6", light: "#132E2B", border: "#1F4E4A", text: "#5EEAD4" },
    },
    shadows: {
      subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
      card: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
      elevated: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
    },
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    display: "text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight",
    h1: "text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight",
    h2: "text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight",
    h3: "text-xl sm:text-2xl font-bold tracking-tight",
    body: "text-sm sm:text-base leading-relaxed",
    small: "text-xs sm:text-sm",
    caption: "text-[11px] sm:text-xs",
  },
  radius: {
    sm: "0.375rem",  // 6px
    md: "0.5rem",    // 8px
    lg: "0.75rem",   // 12px
    xl: "1rem",      // 16px
    "2xl": "1.25rem",// 20px
    "3xl": "1.5rem", // 24px
    full: "9999px",
  },
  spacing: {
    xs: "0.25rem",  // 4px
    sm: "0.5rem",   // 8px
    md: "1rem",     // 16px
    lg: "1.5rem",   // 24px
    xl: "2rem",     // 32px
    "2xl": "3rem",  // 48px
    "3xl": "4rem",  // 64px
  },
  breakpoints: {
    mobile: "390px",
    tablet: "768px",
    desktop: "1280px",
    desktopWide: "1440px",
  },
} as const;

// Backward-compatibility export mapping to light theme values
export const DEFAULT_TOKENS = TOKENS.light;
