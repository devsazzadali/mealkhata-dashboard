import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

/**
 * Admin approves a join request → creates user_role(boarder) + boarder row.
 * Body: { request_id: string, action: "approve" | "reject", monthly_deposit?: number }
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
    const callerId = userRes.user.id;

    const body = await req.json();
    const requestId = body?.request_id as string;
    const action = body?.action as "approve" | "reject";
    if (!requestId || !["approve", "reject"].includes(action)) {
      return json({ error: "Invalid input" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: jr, error: jrErr } = await admin
      .from("join_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (jrErr || !jr) return json({ error: "Request not found" }, 404);

    // Verify caller is mess admin of jr.mess_id
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .eq("role", "mess_admin")
      .eq("mess_id", jr.mess_id)
      .maybeSingle();
    const { data: superRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow && !superRow) return json({ error: "Not authorized" }, 403);

    if (jr.status !== "pending") return json({ error: "Already decided" }, 400);

    if (action === "reject") {
      await admin
        .from("join_requests")
        .update({ status: "rejected", decided_by: callerId, decided_at: new Date().toISOString() })
        .eq("id", requestId);
      return json({ success: true }, 200);
    }

    // Approve flow:
    // 1. Update profile mess_id
    await admin.from("profiles").update({ mess_id: jr.mess_id }).eq("id", jr.user_id);

    // 2. Insert boarder role
    await admin
      .from("user_roles")
      .upsert(
        { user_id: jr.user_id, role: "boarder", mess_id: jr.mess_id },
        { onConflict: "user_id,role,mess_id" }
      );

    // 3. Create boarder row if not exists
    const { data: existingB } = await admin
      .from("boarders")
      .select("id")
      .eq("user_id", jr.user_id)
      .eq("mess_id", jr.mess_id)
      .maybeSingle();
    if (!existingB) {
      await admin.from("boarders").insert({
        mess_id: jr.mess_id,
        user_id: jr.user_id,
        full_name: jr.requested_name,
        phone: jr.requested_phone,
        monthly_deposit: Number(body?.monthly_deposit ?? 0),
      });
    }

    await admin
      .from("join_requests")
      .update({ status: "approved", decided_by: callerId, decided_at: new Date().toISOString() })
      .eq("id", requestId);

    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
