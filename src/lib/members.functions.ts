import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const ADMIN_EMAIL = "laetitia@nowadaysagency.com";

async function ensureBootstrapAdmin(userId: string, email?: string | null) {
  if ((email ?? "").toLowerCase() !== ADMIN_EMAIL) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ error: roleError }, { error: memberError }] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" }),
    supabaseAdmin
      .from("members")
      .upsert(
        { user_id: userId, email: ADMIN_EMAIL, full_name: "Laetitia" },
        { onConflict: "user_id" },
      ),
  ]);
  if (roleError) throw new Error(roleError.message);
  if (memberError) throw new Error(memberError.message);
}

// Open enrollment: anyone who authenticates is enrolled as a member on first access.
// The user_id comes from the authenticated context, so a caller can only ever
// enroll themselves — never someone else.
async function ensureMembership(userId: string, email?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("members")
    .upsert(
      { user_id: userId, email: (email ?? "").toLowerCase() || null },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureBootstrapAdmin(context.userId, context.claims?.email as string | undefined);
    await ensureMembership(context.userId, context.claims?.email as string | undefined);
    const [{ data: member, error: memberError }, { data: isAdmin, error: roleError }] =
      await Promise.all([
        context.supabase.from("members").select("id").eq("user_id", context.userId).maybeSingle(),
        context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      ]);
    if (memberError) throw new Error(memberError.message);
    if (roleError) throw new Error(roleError.message);
    return { isMember: !!member, isAdmin: !!isAdmin };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("members")
      .select("id, user_id, full_name, email, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { emails: string[] }) =>
    z.object({ emails: z.array(z.string().email()).min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: Array<{
      email: string;
      status: "invited" | "linked" | "exists" | "error";
      message?: string;
    }> = [];
    const redirectTo = process.env.SITE_URL
      ? new URL("/accueil", process.env.SITE_URL).href
      : undefined;

    for (const rawEmail of new Set(data.emails.map((email) => email.trim().toLowerCase()))) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;
      try {
        // Try invite first; if user exists, fall back to looking them up.
        const inv = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirectTo || undefined,
        });
        let userId = inv.data?.user?.id;
        if (inv.error || !userId) {
          // Already registered — look up the user via listUsers (paginate small set).
          let found: { id: string } | undefined;
          for (let page = 1; ; page++) {
            const list = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
            if (list.error) throw list.error;
            found = list.data.users.find((user) => (user.email ?? "").toLowerCase() === email);
            if (found || list.data.users.length < 1000) break;
          }
          if (!found) {
            results.push({
              email,
              status: "error",
              message: inv.error?.message ?? "user not found",
            });
            continue;
          }
          userId = found.id;
        }
        const { error: upErr } = await supabaseAdmin
          .from("members")
          .upsert({ user_id: userId, email }, { onConflict: "user_id" });
        if (upErr) {
          results.push({ email, status: "error", message: upErr.message });
        } else {
          results.push({ email, status: inv.error ? "linked" : "invited" });
        }
      } catch (e) {
        results.push({
          email,
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { results };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
