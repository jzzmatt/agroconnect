import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { getProfileDetailsAction } from "@/lib/auth/profile-actions";
import { getMyProductStatsAction } from "@/lib/services/shopping-actions";

describe("Performance Diagnostic Profiling", () => {
  it("measures redundant getCurrentUserProfile sequential execution times", async () => {
    const iterations = 5;
    const individualTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await getProfileDetailsAction();
      const end = performance.now();
      individualTimes.push(end - start);
    }

    const min = Math.min(...individualTimes);
    const max = Math.max(...individualTimes);
    const avg = individualTimes.reduce((a, b) => a + b, 0) / individualTimes.length;

    console.log(`[Diagnostic] getProfileDetailsAction execution across ${iterations} calls:`, {
      min: `${min.toFixed(2)}ms`,
      max: `${max.toFixed(2)}ms`,
      avg: `${avg.toFixed(2)}ms`,
      samples: individualTimes.map((t) => `${t.toFixed(2)}ms`),
    });

    expect(individualTimes.length).toBe(iterations);
  });

  it("measures cascading multi-request waterfalls in route initialization", async () => {
    const startAll = performance.now();
    
    // Simulate what /dashboard runs on mount in parallel vs sequential
    const t0 = performance.now();
    await getProfileDetailsAction(); // Layout call 1
    const t1 = performance.now();
    await getProfileDetailsAction(); // Layout useAuthoritativePlan call 2
    const t2 = performance.now();
    await getProfileDetailsAction(); // Page loadServerProfile call 3
    const t3 = performance.now();
    await getProfileDetailsAction(); // Page useAuthoritativePlan call 4
    const t4 = performance.now();
    await getMyProductStatsAction(); // Page getMyProductStatsAction call 5 (which also calls getOrCreateCurrentProviderProfileAction -> getCurrentUserProfile)
    const t5 = performance.now();

    console.log("[Diagnostic] Sequential waterfall breakdown:", {
      layoutProfileFetch: `${(t1 - t0).toFixed(2)}ms`,
      layoutPlanFetch: `${(t2 - t1).toFixed(2)}ms`,
      pageProfileFetch: `${(t3 - t2).toFixed(2)}ms`,
      pagePlanFetch: `${(t4 - t3).toFixed(2)}ms`,
      pageStatsFetch: `${(t5 - t4).toFixed(2)}ms`,
      totalSequential: `${(t5 - t0).toFixed(2)}ms`,
    });

    expect(t5 - t0).toBeGreaterThanOrEqual(0);
  });
});
