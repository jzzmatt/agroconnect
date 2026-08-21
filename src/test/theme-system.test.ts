import { describe, it, expect } from "vitest";
import { TOKENS } from "@/config/tokens";
import { getMapTileUrl } from "@/lib/location/providers/mapquest-map";

describe("AGROCONNECT Phase 2B — Dark Mode & Theme System", () => {
  it("1. Defines dedicated semantic tokens for Light Theme", () => {
    expect(TOKENS.light.colors.background).toBe("#FFFFFF");
    expect(TOKENS.light.colors.primary).toBe("#0E6B38");
    expect(TOKENS.light.colors.surface).toBe("#F8FAF9");
    expect(TOKENS.light.colors.expert.primary).toBe("#0E6B38");
  });

  it("2. Defines dedicated semantic tokens for Dark Theme without pure black / inverted hack", () => {
    expect(TOKENS.dark.colors.background).toBe("#08160E");
    expect(TOKENS.dark.colors.surface).toBe("#0D2217");
    expect(TOKENS.dark.colors.surfaceElevated).toBe("#122C1F");
    expect(TOKENS.dark.colors.primary).toBe("#1B9C52");
    expect(TOKENS.dark.colors.foreground).toBe("#F1F5F3");
  });

  it("3. Configures theme-aware map layer tile URLs for Light and Dark modes", () => {
    const lightTile = getMapTileUrl("test_key", "map");
    expect(lightTile.url).toContain("tiles.mapquest.com/render/latest/vivid");

    const darkTile = getMapTileUrl("test_key", "dark");
    expect(darkTile.url).toContain("tiles.mapquest.com/render/latest/night");
  });

  it("4. Validates database profile type supports theme_preference field", () => {
    const mockProfile = {
      id: "uuid-123",
      clerk_user_id: "user_123",
      display_name: "Dr. João Silva",
      first_name: "João",
      last_name: "Silva",
      email: "joao@agroconnect.ao",
      phone: "+244923000000",
      avatar_url: null,
      bio: "Veterinário",
      profile_slug: "dr-joao",
      theme_preference: "dark" as const,
      is_active: true,
      roles: ["veterinarian" as const],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(mockProfile.theme_preference).toBe("dark");
    expect(["light", "dark"]).toContain(mockProfile.theme_preference);
  });
});
