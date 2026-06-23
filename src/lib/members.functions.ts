import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: member }, { data: isAdmin }] = await Promise.all([
      context.supabase.from("members").select("id").eq("user_id", context.userId).maybeSingle(),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
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

    const results: Array<{ email: string; status: "invited" | "linked" | "exists" | "error"; message?: string }> = [];
    const redirectTo = (process.env.SITE_URL || "") + "/accueil";

    for (const rawEmail of data.emails) {
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
          const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = list.data?.users.find((u) => (u.email ?? "").toLowerCase() === email);
          if (!found) {
            results.push({ email, status: "error", message: inv.error?.message ?? "user not found" });
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
      } catch (e: any) {
        results.push({ email, status: "error", message: e?.message ?? String(e) });
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
