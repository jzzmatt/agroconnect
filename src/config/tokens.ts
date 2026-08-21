/**
 * AGROCONNECT Design Tokens
 * Derived from Figma Visual Identity System
 */
export const TOKENS = {
  colors: {
    // Brand Greens
    agroDarkGreen: "#063A1D", // Darkest forest green
    agroGreen: "#0E6B38",     // Primary brand green
    agroLightGreen: "#E8F5EE",// Soft green tint for badges / subtle backgrounds
    agroAccentGreen: "#1B9C52",// Vibrant accent green

    // Neutrals
    background: "#FFFFFF",
    surface: "#F8FAF9",
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
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  radius: {
    sm: "0.375rem", // 6px
    md: "0.5rem",   // 8px
    lg: "0.75rem",  // 12px
    xl: "1rem",     // 16px
    "2xl": "1.25rem",// 20px
    full: "9999px",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  breakpoints: {
    mobile: "390px",
    tablet: "768px",
    desktop: "1280px",
    desktopWide: "1440px",
  },
} as const;
