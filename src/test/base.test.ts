import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("Base utility tests", () => {
  it("merges class names correctly with cn()", () => {
    const result = cn("bg-red-500", "p-4", { "text-white": true, "hidden": false });
    expect(result).toBe("bg-red-500 p-4 text-white");
  });
});
