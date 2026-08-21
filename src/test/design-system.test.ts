import { describe, it, expect } from "vitest";
import { TOKENS } from "@/config/tokens";

describe("AGROCONNECT Design Tokens", () => {
  it("defines core brand green palette and tokens matching Figma specs for light and dark", () => {
    expect(TOKENS.light.colors.primary).toBe("#0E6B38");
    expect(TOKENS.dark.colors.primary).toBe("#1B9C52");
    expect(TOKENS.radius.lg).toBe("0.75rem");
  });

  it("defines responsive breakpoints for mobile and desktop", () => {
    expect(TOKENS.breakpoints.mobile).toBe("390px");
    expect(TOKENS.breakpoints.desktopWide).toBe("1440px");
  });
});
