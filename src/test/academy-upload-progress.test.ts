import { describe, it, expect } from "vitest";
import { computeBunnyUiProgress } from "@/lib/academy/upload-progress";

describe("computeBunnyUiProgress", () => {
  it("weights transfer below 40% until the file is fully sent", () => {
    expect(computeBunnyUiProgress({ transferPercent: 0, bunnyStatusCode: 0, encodeProgress: 0 }).percent).toBe(4);
    expect(computeBunnyUiProgress({ transferPercent: 0.5, bunnyStatusCode: 0, encodeProgress: 0 }).percent).toBe(20);
    expect(computeBunnyUiProgress({ transferPercent: 1, bunnyStatusCode: 0, encodeProgress: 0 }).phase).toBe(
      "bunny-receipt"
    );
  });

  it("maps Bunny encoding progress into the final 45% of the bar", () => {
    const half = computeBunnyUiProgress({ transferPercent: 1, bunnyStatusCode: 2, encodeProgress: 50 });
    expect(half.phase).toBe("encoding");
    expect(half.percent).toBe(78);

    const done = computeBunnyUiProgress({ transferPercent: 1, bunnyStatusCode: 4, encodeProgress: 100 });
    expect(done.phase).toBe("ready");
    expect(done.percent).toBe(100);
  });
});
