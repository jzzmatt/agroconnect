/**
 * AGROCONNECT Design Tokens
 * Source of Truth: AGROCONNECT — Product Design System & MVP (Figma)
 */
export const TOKENS = {
  colors: {
    // Primary Brand Greens
    agroDarkGreen: "#063A1D",  // Deep Forest Green
    agroGreen: "#0E6B38",      // Primary Brand Green
    agroLightGreen: "#E8F5EE", // Soft Green Tint / Card Background
    agroAccentGreen: "#1B9C52",// Vibrant Accent Green
    agroEmerald: "#059669",

    // Supporting Solution Pillar Colors
    expert: {
      primary: "#0E6B38",
      light: "#E8F5EE",
      border: "#C3D6CB",
    },
    academy: {
      primary: "#1D4ED8",
      light: "#EFF6FF",
      border: "#BFDBFE",
    },
    shopping: {
      primary: "#D97706",
      light: "#FFFBEB",
      border: "#FDE68A",
    },
    localizacao: {
      primary: "#0D9488",
      light: "#F0FDFA",
      border: "#99F6E4",
    },

    // Neutrals & Surfaces
    background: "#FFFFFF",
    surface: "#F8FAF9",
    surfaceCard: "#FFFFFF",
    surfaceSubtle: "#F1F5F3",
    textPrimary: "#0F261B",
    textSecondary: "#4A6355",
    mutedText: "#728A7D",
    border: "#E2EBE5",
    borderStrong: "#C3D6CB",

    // Semantic Status
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
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
  shadows: {
    subtle: "0 1px 2px 0 rgba(14, 107, 56, 0.05)",
    card: "0 4px 6px -1px rgba(14, 107, 56, 0.08), 0 2px 4px -2px rgba(14, 107, 56, 0.05)",
    elevated: "0 10px 15px -3px rgba(14, 107, 56, 0.1), 0 4px 6px -4px rgba(14, 107, 56, 0.05)",
  },
  breakpoints: {
    mobile: "390px",
    tablet: "768px",
    desktop: "1280px",
    desktopWide: "1440px",
  },
} as const;
