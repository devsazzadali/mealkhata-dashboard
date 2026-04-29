import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

interface CreateBoarderBody {
  full_name: string;
  phone: string;             // 11-digit BD phone
  password: string;          // initial password
  guardian_name?: string;
  guardian_phone?: string;
  room_id?: string | null;
  seat_number?: string;
  monthly_deposit?: number;
  notes?: string;
}

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("8801") && digits.length === 13) return "0" + digits.slice(3);
  if (digits.startsWith("01") && digits.length === 11) return digits;
  if (digits.startsWith("1") && digits.length === 10) return "0" + digits;
  return digits;
}

function isValidPhone(p: string): boolean {
  return /^01[3-9]\d{8}$/.test(p);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Caller-context client to verify identity & role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userRes.user.id;

    // Verify caller is a mess_admin and get their mess_id
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("mess_id, role")
      .eq("user_id", callerId)
      .in("role", ["mess_admin", "super_admin"])
      .maybeSingle();

    if (!roleRow) return json({ error: "Only admins can create boarders" }, 403);
    const messId = roleRow.mess_id;
    if (!messId) return json({ error: "Admin has no mess assigned" }, 400);

    const body = (await req.json()) as CreateBoarderBody;
    const phone = normalizePhone(body.phone || "");

    if (!body.full_name?.trim()) return json({ error: "Name is required" }, 400);
    if (!isValidPhone(phone)) return json({ error: "Invalid Bangladeshi mobile number" }, 400);
    if (!body.password || body.password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

    const email = `${phone}@mealkhata.app`;

    // Service-role client for admin ops
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Create auth user (or fetch existing)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name, phone, mess_id: messId },
    });

    if (createErr && !createErr.message.toLowerCase().includes("already")) {
      return json({ error: createErr.message }, 400);
    }

    let userId = created?.user?.id;
    if (!userId) {
      // Lookup existing
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === email)?.id;
      if (!userId) return json({ error: "Failed to create or find user" }, 500);
    }

    // 2. Ensure profile points at the right mess (trigger may have inserted with NULL)
    await admin.from("profiles").upsert(
      { id: userId, full_name: body.full_name, phone, mess_id: messId },
      { onConflict: "id" }
    );

    // 3. Assign boarder role (idempotent)
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "boarder", mess_id: messId },
      { onConflict: "user_id,role,mess_id" }
    );

    // 4. Create boarder record (linked to user_id)
    const { data: boarder, error: bErr } = await admin
      .from("boarders")
      .insert({
        mess_id: messId,
        user_id: userId,
        full_name: body.full_name,
        phone,
        guardian_name: body.guardian_name || null,
        guardian_phone: body.guardian_phone || null,
        room_id: body.room_id || null,
        seat_number: body.seat_number || null,
        monthly_deposit: body.monthly_deposit ?? 0,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (bErr) return json({ error: bErr.message }, 400);

    return json({ success: true, boarder }, 200);
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
