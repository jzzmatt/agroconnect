import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminServerSupabaseClient } from "@/lib/supabase/server";
import { isManagedProfileImageUrl } from "@/lib/agriprofile/publication";

interface ClerkUserWebhookData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: { status: string };
  }>;
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  image_url: string | null;
  phone_numbers: Array<{
    id: string;
    phone_number: string;
  }>;
}

interface ClerkWebhookEvent {
  data: ClerkUserWebhookData;
  type: "user.created" | "user.updated" | "user.deleted";
  object: "event";
}

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET environment variable.");
    return NextResponse.json(
      { error: "Erro de configuração do webhook." },
      { status: 500 }
    );
  }

  // 1. Extract Svix signature headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Assinatura de webhook em falta ou inválida." },
      { status: 400 }
    );
  }

  // 2. Read and verify raw request body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("[Clerk Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Assinatura do webhook não pôde ser verificada." },
      { status: 400 }
    );
  }

  // 3. Process Event with Supabase (using privileged admin client)
  const eventType = evt.type;
  const user = evt.data;

  try {
    const supabase = createAdminServerSupabaseClient();

    if (eventType === "user.created") {
      const primaryEmail =
        user.email_addresses?.find((e) => e.id === user.primary_email_address_id)
          ?.email_address ||
        user.email_addresses?.[0]?.email_address ||
        null;

      const primaryPhone = user.phone_numbers?.[0]?.phone_number || null;
      const firstName = user.first_name || null;
      const lastName = user.last_name || null;
      const emailLocalPart = primaryEmail?.includes("@") ? primaryEmail.split("@")[0] : null;
      const displayName =
        user.username ||
        (firstName && lastName ? `${firstName} ${lastName}`.trim() : null) ||
        firstName ||
        emailLocalPart ||
        "Utilizador";

      const profileSlug =
        user.username || `user-${user.id.slice(-8)}`;

      // Idempotent upsert of user profile. Omit subscription_plan so INSERT
      // stores NULL (no plan) and UPDATE does not overwrite an existing plan.
      const { data: profile, error: profileError } = await (supabase.from("profiles") as any)
        .upsert(
          {
            clerk_user_id: user.id,
            email: primaryEmail,
            phone: primaryPhone,
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            avatar_url: user.image_url,
            profile_slug: profileSlug,
            professional_title: "none",
            active_profile_type: "personal",
            preferred_language: "pt",
            account_type: "customer",
            status: "active",
            theme_preference: "light",
            is_active: true,
          },
          { onConflict: "clerk_user_id" }
        )
        .select("id")
        .single();

      if (profileError) {
        console.error("[Clerk Webhook] Profile creation error:", profileError);
        return NextResponse.json(
          { error: "Falha ao criar o perfil." },
          { status: 500 }
        );
      }

      // Ensure base default role (student) is present
      if (profile) {
        await (supabase.from("user_roles") as any).upsert(
          {
            profile_id: profile.id,
            clerk_user_id: user.id,
            role: "student",
            is_primary: true,
          },
          { onConflict: "profile_id,role" }
        );
      }

      // Record audit log
      await (supabase.from("audit_logs") as any).insert({
        actor_profile_id: profile?.id,
        action: "auth.profile_created",
        entity_type: "profile",
        entity_id: profile?.id,
        metadata: { event: "user.created", clerk_user_id: user.id },
      });

      return NextResponse.json({ success: true, message: "Perfil criado com sucesso." });
    }

    if (eventType === "user.updated") {
      const primaryEmail =
        user.email_addresses?.find((e) => e.id === user.primary_email_address_id)
          ?.email_address ||
        user.email_addresses?.[0]?.email_address ||
        null;

      const primaryPhone = user.phone_numbers?.[0]?.phone_number || null;
      const firstName = user.first_name || null;
      const lastName = user.last_name || null;
      const displayName =
        firstName && lastName
          ? `${firstName} ${lastName}`.trim()
          : firstName || user.username || primaryEmail;

      const { data: current } = await (supabase.from("profiles") as any)
        .select("id, avatar_url")
        .eq("clerk_user_id", user.id)
        .maybeSingle();

      const updates: Record<string, unknown> = {
        email: primaryEmail,
        phone: primaryPhone,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
      };
      if (!isManagedProfileImageUrl(current?.avatar_url)) {
        updates.avatar_url = user.image_url;
      }

      const { data: profile, error: updateError } = await (supabase.from("profiles") as any)
        .update(updates)
        .eq("clerk_user_id", user.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("[Clerk Webhook] Profile update error:", updateError);
        return NextResponse.json(
          { error: "Falha ao atualizar o perfil." },
          { status: 500 }
        );
      }

      // Record audit log
      if (profile) {
        await (supabase.from("audit_logs") as any).insert({
          actor_profile_id: profile.id,
          action: "auth.profile_updated",
          entity_type: "profile",
          entity_id: profile.id,
          metadata: { event: "user.updated", clerk_user_id: user.id },
        });
      }

      return NextResponse.json({ success: true, message: "Perfil atualizado." });
    }

    if (eventType === "user.deleted") {
      // Soft-deactivate profile to preserve historical marketplace integrity (reviews, requests, listings)
      const { data: profile, error: deleteError } = await (supabase.from("profiles") as any)
        .update({
          status: "inactive",
          is_active: false,
        })
        .eq("clerk_user_id", user.id)
        .select("id")
        .single();

      if (deleteError) {
        console.error("[Clerk Webhook] Profile deactivation error:", deleteError);
        return NextResponse.json(
          { error: "Falha ao desativar o perfil." },
          { status: 500 }
        );
      }

      if (profile) {
        await (supabase.from("audit_logs") as any).insert({
          actor_profile_id: profile.id,
          action: "auth.profile_deactivated",
          entity_type: "profile",
          entity_id: profile.id,
          metadata: { event: "user.deleted", clerk_user_id: user.id },
        });
      }

      return NextResponse.json({ success: true, message: "Perfil desativado." });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Clerk Webhook] Processing error:", error);
    return NextResponse.json(
      { error: "Erro interno no processamento do webhook." },
      { status: 500 }
    );
  }
}
