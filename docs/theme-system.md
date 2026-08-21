# AGROCONNECT — Theme System (Phase 2B)

## 1. Overview & Source of Truth

**AGROCONNECT** supports two official visual themes derived from the **Product Design System & MVP** (Figma Source of Truth):

1. **Light / Claro / Branco**: Clean, high-clarity interface with crisp white card surfaces, subtle green borders (`#E2EBE5`), and brand green `#0E6B38`.
2. **Dark / Escuro / Verde Floresta**: Dedicated dark theme with deep forest green surfaces (`#08160E` background, `#0D2217` surfaces, `#122C1F` cards, and vibrant green accents `#1B9C52`).

> **Design Principle**: Dark Mode is **NOT** a simple CSS `invert()` or pure `#000000` background. It follows the dedicated Figma Dark Desktop & Dark Mobile frames with natural forest undertones and high-contrast typography.

---

## 2. Theme Architecture & Tokens

The application uses semantic CSS custom properties defined in `src/app/globals.css` and TypeScript design tokens in `src/config/tokens.ts`.

### Semantic Tokens Reference

| Semantic Token | Light Mode (`:root`) | Dark Mode (`.dark` / `[data-theme="dark"]`) | Description |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#08160E` | Main page background |
| `--foreground` | `#0F261B` | `#F1F5F3` | Primary body text |
| `--surface` | `#F8FAF9` | `#0D2217` | Subtle background section surface |
| `--surface-elevated` | `#FFFFFF` | `#122C1F` | Raised cards, dropdowns, popovers |
| `--surface-card` | `#FFFFFF` | `#122C1F` | Domain card background |
| `--primary` | `#0E6B38` | `#1B9C52` | Primary brand green |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text on primary brand buttons |
| `--secondary` | `#E8F5EE` | `#163626` | Soft pill & badge background |
| `--secondary-foreground`| `#063A1D` | `#86EFAC` | Text on secondary badges |
| `--muted` | `#F1F5F3` | `#163626` | Input and subtle backgrounds |
| `--muted-foreground` | `#4A6355` | `#94A89E` | Secondary & metadata text |
| `--border` | `#E2EBE5` | `#1E4431` | Standard card and container borders |
| `--border-strong` | `#C3D6CB` | `#2E6147` | High-contrast borders |
| `--sidebar` | `#FFFFFF` | `#0D2217` | Desktop & mobile drawer background |
| `--sidebar-foreground` | `#0F261B` | `#F1F5F3` | Navigation link text |
| `--sidebar-active` | `#0E6B38` | `#1B9C52` | Selected navigation item background |
| `--input` | `#FFFFFF` | `#0D2217` | Form input field background |
| `--input-border` | `#E2EBE5` | `#1E4431` | Form input field border |

---

## 3. Flash-Free SSR Theme Initialization

To prevent the **Flash of Incorrect Theme (FOIT)** during Next.js server-side rendering and hydration:

1. **`ThemeScript` (`src/lib/theme/provider.tsx`)**:
   - Executes synchronously in `<head>` before HTML rendering.
   - Reads `localStorage.getItem('agroconnect-theme-preference')` or checks `window.matchMedia('(prefers-color-scheme: dark)')`.
   - Adds `.light` or `.dark` and `data-theme` directly to `document.documentElement`.
2. **`html` Element**:
   - Marked with `suppressHydrationWarning` on `<html lang="pt">`.

---

## 4. Theme Preference Hierarchy

When resolving the active theme:

```
1. Explicit User Selection (ThemeSwitcher in Navbar / Header / Settings)
                  ↓
2. Authenticated Profile Preference (`profiles.theme_preference` in Supabase)
                  ↓
3. Saved Client Local Storage (`localStorage['agroconnect-theme-preference']`)
                  ↓
4. System OS Preference (`prefers-color-scheme`)
                  ↓
5. Default Fallback (`light`)
```

---

## 5. Theme-Aware AgriLocalização (Map Engine)

The MapLibre GL + OpenFreeMap provider dynamically adapts its vector tile style when the theme switches:

```typescript
import { getThemeMapStyle } from "@/lib/location/providers/maplibre-openfreemap";

// In Light Mode:
// https://tiles.openfreemap.org/styles/liberty

// In Dark Mode:
// https://tiles.openfreemap.org/styles/positron (High-contrast minimal dark base)
```

Map marker pins preserve distinct color coding (**AgriExpert** `#0E6B38`/`#1B9C52`, **AgriAcademy** `#1D4ED8`/`#3B82F6`, **AgriShopping** `#D97706`/`#F59E0B`, **AgriLocalização** `#0D9488`/`#14B8A6`) with adaptive popup cards.

---

## 6. Database Migration

The `profiles` table in Supabase contains the user preference:

```sql
ALTER TABLE public.profiles
ADD COLUMN theme_preference TEXT DEFAULT 'light' NOT NULL
CHECK (theme_preference IN ('light', 'dark'));
```

Migration file: `supabase/migrations/20260821000002_add_theme_preference.sql`.

---

## 7. Adding New Components with Theme Support

Always use semantic Tailwind utility classes rather than hardcoding colors:

```tsx
// Good: Automatically responds to Light and Dark themes
<div className="bg-surface-card border border-border text-foreground p-6 rounded-3xl">
  <h3 className="text-foreground font-bold">Título</h3>
  <p className="text-muted-foreground">Descrição</p>
  <button className="bg-primary text-primary-foreground hover:bg-primary-hover">
    Ação
  </button>
</div>

// Bad: Breaks in Dark Mode
<div className="bg-white text-black p-6">...</div>
```
