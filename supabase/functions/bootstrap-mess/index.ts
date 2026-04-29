import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

/**
 * Bootstrap endpoint: if the caller has NO role yet AND no other mess_admin
 * exists in the platform OR they're the very first user, allow them to create
 * a mess and become its mess_admin. Otherwise reject.
 *
 * Body: { mess_name: string, address?: string, phone?: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return json({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Reject if caller already has any role
    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (existingRoles && existingRoles.length > 0) {
      return json({ error: "You already have a role assigned" }, 400);
    }

    const body = await req.json();
    const messName = (body?.mess_name || "").trim();
    if (!messName) return json({ error: "Mess name is required" }, 400);

    // Create mess
    const { data: mess, error: messErr } = await admin
      .from("messes")
      .insert({
        name: messName,
        address: body.address || null,
        phone: body.phone || null,
        status: "active",
      })
      .select()
      .single();
    if (messErr) return json({ error: messErr.message }, 400);

    // Assign caller as mess_admin and update profile mess_id
    await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "mess_admin", mess_id: mess.id });

    await admin.from("profiles").update({ mess_id: mess.id }).eq("id", userId);

    return json({ success: true, mess }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
