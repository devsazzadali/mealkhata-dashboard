import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

interface CreateMessBody {
  mess_name: string;
  address?: string;
  mess_phone?: string;
  // Admin user
  admin_full_name: string;
  admin_phone: string;
  admin_password: string;
}

function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("8801") && digits.length === 13) return "0" + digits.slice(3);
  if (digits.startsWith("01") && digits.length === 11) return digits;
  if (digits.startsWith("1") && digits.length === 10) return "0" + digits;
  return digits;
}

const isValidPhone = (p: string) => /^01[3-9]\d{8}$/.test(p);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) return json({ error: "Only super admins can create messes" }, 403);

    const body = (await req.json()) as CreateMessBody;
    const messName = (body.mess_name || "").trim();
    const adminName = (body.admin_full_name || "").trim();
    const adminPhone = normalizePhone(body.admin_phone || "");

    if (!messName) return json({ error: "Mess name is required" }, 400);
    if (!adminName) return json({ error: "Admin name is required" }, 400);
    if (!isValidPhone(adminPhone)) return json({ error: "Invalid admin mobile number" }, 400);
    if (!body.admin_password || body.admin_password.length < 6)
      return json({ error: "Password must be at least 6 characters" }, 400);

    // 1. Create the mess
    const { data: mess, error: messErr } = await admin
      .from("messes")
      .insert({
        name: messName,
        address: body.address || null,
        phone: body.mess_phone || null,
        status: "active",
      })
      .select()
      .single();
    if (messErr) return json({ error: messErr.message }, 400);

    // 2. Create or fetch the admin auth user
    const email = `${adminPhone}@mealkhata.app`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: body.admin_password,
      email_confirm: true,
      user_metadata: { full_name: adminName, phone: adminPhone, mess_id: mess.id },
    });
    if (createErr && !createErr.message.toLowerCase().includes("already")) {
      return json({ error: createErr.message }, 400);
    }
    let userId = created?.user?.id;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === email)?.id;
      if (!userId) return json({ error: "Failed to create or find admin user" }, 500);
    }

    // 3. Profile + role
    await admin
      .from("profiles")
      .upsert({ id: userId, full_name: adminName, phone: adminPhone, mess_id: mess.id }, { onConflict: "id" });

    await admin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "mess_admin", mess_id: mess.id },
        { onConflict: "user_id,role,mess_id" }
      );

    return json({ success: true, mess, admin_user_id: userId }, 200);
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
