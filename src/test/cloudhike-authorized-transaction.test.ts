/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  withAuthorizedCloudhikeTransaction,
  type CloudhikeConnection,
  type CloudhikePool,
} from "@/lib/cloudhike/authorized-transaction";
import {
  CloudhikeAuthorizationError,
  claimsForVerifiedSession,
  sessionFromClerkAuth,
} from "@/lib/cloudhike/verified-clerk-session";
import { productCandidateParams, productCandidateSql } from "@/lib/cloudhike/marketplace-search";

describe("CloudHike authorization boundary", () => {
  it("rejects a missing, blank, or unverified Clerk subject before connecting", async () => {
    const pool = connectMustNotRun();
    for (const userId of [null, undefined, "", "   ", "user\0"]) {
      expect(() => sessionFromClerkAuth({ userId })).toThrow(CloudhikeAuthorizationError);
      await expect(
        withAuthorizedCloudhikeTransaction(pool, { kind: "verified-clerk-session", clerkUserId: "" }, async () => {
          throw new Error("work ran");
        }),
      ).rejects.toMatchObject({ code: "unauthenticated" });
    }
  });

  it("builds claims from the verified subject and ignores a client-supplied subject", () => {
    const session = sessionFromClerkAuth({
      userId: "user_a",
      sessionClaims: { sub: "user_b", role: "service_role" },
    } as { userId: string });
    expect(claimsForVerifiedSession(session)).toEqual({ sub: "user_a", role: "authenticated" });
  });

  it("sets transaction-local claims and refuses a later claims mutation", async () => {
    const seen: Array<{ text: string; values?: readonly unknown[] }> = [];
    const pool = scriptedPool(seen, { rolsuper: false, rolbypassrls: false, owns_database: false, owns_public_table: false });
    await expect(
      withAuthorizedCloudhikeTransaction(pool, sessionFromClerkAuth({ userId: "user_a" }), async (client) => {
        await client.query("SELECT set_config('request.jwt.claims', $1, true)", ['{"sub":"user_b"}']);
      }),
    ).rejects.toMatchObject({ code: "unverified" });
    expect(seen.map((entry) => entry.text)).toEqual([
      "BEGIN",
      "SELECT set_config('request.jwt.claims', $1, true)",
      expect.stringContaining("pg_roles"),
      "ROLLBACK",
      "RESET request.jwt.claims",
    ]);
    expect(seen[1]?.values).toEqual(['{"sub":"user_a","role":"authenticated"}']);
    expect(readFileSync("src/lib/cloudhike/authorized-transaction.ts", "utf8")).not.toContain(
      "set_config('request.jwt.claims', $1, false)",
    );
  });

  it("refuses a superuser, bypass, or database-owner connection before the caller's query", async () => {
    const seen: Array<{ text: string }> = [];
    const pool = scriptedPool(seen, { rolsuper: false, rolbypassrls: false, owns_database: true, owns_public_table: false });
    let workRan = false;
    await expect(
      withAuthorizedCloudhikeTransaction(pool, sessionFromClerkAuth({ userId: "user_a" }), async () => {
        workRan = true;
        return "ok";
      }),
    ).rejects.toMatchObject({ code: "privileged-connection" });
    expect(workRan).toBe(false);
    expect(seen.map((entry) => entry.text)).toContain("ROLLBACK");
  });

  it("keeps search text in a parameter and rejects a relation that changes the statement", () => {
    const query = "pão'; DROP TABLE public.products; --";
    const sql = productCandidateSql("public.marketplace_product_candidates");
    expect(sql).not.toContain(query);
    expect(sql).not.toMatch(/\b(LIMIT|OFFSET)\b/);
    expect(productCandidateParams({ query })).toEqual([query, null, null, null, null, null, null]);
    expect(() => productCandidateSql("public.products; DROP TABLE public.products")).toThrow(/identifier/);
  });
});

function connectMustNotRun(): CloudhikePool {
  return {
    connect: async () => {
      throw new Error("connected");
    },
  };
}

function scriptedPool(
  seen: Array<{ text: string; values?: readonly unknown[] }>,
  role: { rolsuper: boolean; rolbypassrls: boolean; owns_database: boolean; owns_public_table: boolean },
): CloudhikePool {
  const pool: CloudhikePool = {
    connect: async () =>
      ({
        query: async (text: string, values?: readonly unknown[]) => {
          seen.push({ text, values });
          if (text.includes("pg_roles")) return { rows: [role] };
          return { rows: [] };
        },
        release: () => undefined,
      }) as CloudhikeConnection,
  };
  return pool;
}
