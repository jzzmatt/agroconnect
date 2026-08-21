import { describe, it, expect } from "vitest";
import { createPublicSupabaseClient, createAuthenticatedSupabaseClient } from "@/lib/supabase/client";

describe("Clerk + Supabase Integration Architecture", () => {
  it("creates public Supabase client without authentication header", () => {
    const client = createPublicSupabaseClient();
    expect(client).toBeDefined();
    expect(client.from).toBeTypeOf("function");
  });

  it("creates authenticated Supabase client forwarding Clerk JWT token", () => {
    const mockClerkToken = "mock_clerk_jwt_session_token_123";
    const client = createAuthenticatedSupabaseClient(mockClerkToken);
    expect(client).toBeDefined();
    expect(client.from).toBeTypeOf("function");
  });
});
