import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

/**
 * Public signup that creates an auth user using a phone-as-email scheme.
 * This is INTENTIONALLY public so a brand-new user can register, then
 * call /bootstrap-mess to create their first mess and become its admin.
 *
 * Body: { full_name: string, phone: string, password: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const fullName = (body?.full_name || "").trim();
    const phoneRaw = (body?.phone || "").replace(/\D/g, "");
    const phone =
      phoneRaw.startsWith("8801") && phoneRaw.length === 13
        ? "0" + phoneRaw.slice(3)
        : phoneRaw;
    const password = body?.password || "";

    if (!fullName) return json({ error: "Name is required" }, 400);
    if (!/^01[3-9]\d{8}$/.test(phone)) return json({ error: "Invalid Bangladeshi mobile" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

    const email = `${phone}@mealkhata.app`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (error) return json({ error: error.message }, 400);

    return json({ success: true, user_id: data.user?.id, email }, 200);
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
