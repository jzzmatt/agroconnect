// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkBehavior = vi.hoisted(() => ({
  mode: "throw" as "throw" | "pass",
}));

vi.mock("@clerk/nextjs/server", async () => {
  const actual = await vi.importActual<typeof import("@clerk/nextjs/server")>("@clerk/nextjs/server");
  return {
    ...actual,
    clerkMiddleware: () => async () => {
      if (clerkBehavior.mode === "throw") {
        throw new Error("Clerk: handshake status without redirect");
      }
      const { NextResponse } = await import("next/server");
      return NextResponse.next();
    },
  };
});

import middleware from "@/middleware";

function requestFor(pathname: string) {
  return new NextRequest(new URL(pathname, "https://www.agroconnect.ao"));
}

describe("middleware handshake recovery", () => {
  beforeEach(() => {
    clerkBehavior.mode = "throw";
  });

  it("renders a public page when Clerk throws a handshake error", async () => {
    const response = await middleware(requestFor("/"), {} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a protected page to sign-in when Clerk throws a handshake error", async () => {
    const response = await middleware(requestFor("/dashboard"), {} as never);
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") || "");
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("redirect_url")).toBe("/dashboard");
  });

  it("returns Clerk's response when the handshake succeeds", async () => {
    clerkBehavior.mode = "pass";
    const response = await middleware(requestFor("/"), {} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
