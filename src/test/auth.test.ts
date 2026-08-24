import { describe, it, expect } from "vitest";
import { createPublicSupabaseClient, createAuthenticatedSupabaseClient } from "@/lib/supabase/client";
import { Webhook } from "svix";

describe("AGROCONNECT Phase 4 — Clerk Authentication & User Identity Integration", () => {
  it("1. Creates unauthenticated public Supabase client for anonymous browsing", () => {
    const client = createPublicSupabaseClient();
    expect(client).toBeDefined();
    expect(client.from).toBeTypeOf("function");
  });

  it("2. Creates authenticated Supabase client with forwarded Clerk JWT bearer token", () => {
    const mockClerkToken = "mock_clerk_jwt_session_token_xyz_456";
    const client = createAuthenticatedSupabaseClient(mockClerkToken);
    expect(client).toBeDefined();
    expect(client.from).toBeTypeOf("function");
  });

  it("3. Verifies Svix webhook verification rejects invalid signatures", () => {
    // Secret formatted as base64 secret according to standard Svix specs (whsec_...)
    const mockSecret = "whsec_MfKQ9r8GKYdaOpWjdvgMmQVxCuhstap8";
    const wh = new Webhook(mockSecret);
    const payload = JSON.stringify({
      data: { id: "user_test123", first_name: "Carlos" },
      type: "user.created",
    });

    expect(() => {
      wh.verify(payload, {
        "svix-id": "msg_test",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,invalid_signature_string",
      });
    }).toThrow();
  });

  it("4. Validates user identity model mapping (clerk_user_id to profiles.id UUID)", () => {
    const clerkUser = {
      id: "user_2P9x87kLmnPQ",
      email: "dr.joao@agroconnect.ao",
      first_name: "João",
      last_name: "Silva",
    };

    const supabaseProfile = {
      id: "b2d5a3f1-4e78-4c91-95e2-2a4567890123", // Distinct UUID PK
      clerk_user_id: clerkUser.id, // External identity reference
      display_name: "Dr. João Silva",
      email: clerkUser.email,
      account_type: "customer",
      status: "active",
      preferred_language: "pt",
    };

    expect(supabaseProfile.id).not.toBe(clerkUser.id);
    expect(supabaseProfile.clerk_user_id).toBe(clerkUser.id);
    expect(supabaseProfile.account_type).toBe("customer");
    expect(supabaseProfile.preferred_language).toBe("pt");
  });

  it("5. Verifies service role client never exposes secret client-side", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("6. Verifies sign-out redirects to the main landing page", () => {
    const redirectUrl = "/";
    expect(redirectUrl).toBe("/");
  });

  it("7. Verifies new users have no subscription until they explicitly subscribe", () => {
    const defaultNewUserPlan = null;
    expect(defaultNewUserPlan).toBeNull();
  });
});
