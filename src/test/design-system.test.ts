import { describe, it, expect } from "vitest";
import { TOKENS } from "@/config/tokens";

describe("AGROCONNECT Design Tokens", () => {
  it("defines core brand green palette and tokens matching Figma specs", () => {
    expect(TOKENS.colors.agroGreen).toBe("#0E6B38");
    expect(TOKENS.colors.agroDarkGreen).toBe("#063A1D");
    expect(TOKENS.colors.agroLightGreen).toBe("#E8F5EE");
    expect(TOKENS.radius.lg).toBe("0.75rem");
  });

  it("defines responsive breakpoints for mobile and desktop", () => {
    expect(TOKENS.breakpoints.mobile).toBe("390px");
    expect(TOKENS.breakpoints.desktopWide).toBe("1440px");
  });
});
