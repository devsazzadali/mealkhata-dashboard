import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, UtensilsCrossed, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidBdPhone, normalizePhone, phoneToEmail } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().refine(isValidBdPhone, "Enter a valid mobile (017XXXXXXXX)"),
  password: z.string().min(6, "At least 6 characters"),
  mess_name: z.string().trim().min(2, "Enter your mess name").max(80),
});
type Vals = z.infer<typeof schema>;

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function Signup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Vals>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (vals: Vals) => {
    setSubmitting(true);
    try {
      const phone = normalizePhone(vals.phone);

      // 1. Create auth user via public signup function (uses service role)
      const signupRes = await fetch(`${FUNCTIONS_URL}/admin-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ full_name: vals.full_name, phone, password: vals.password }),
      });
      const signupJson = await signupRes.json();
      if (!signupRes.ok) throw new Error(signupJson.error || "Signup failed");

      // 2. Sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(phone),
        password: vals.password,
      });
      if (signInErr) throw signInErr;

      // 3. Bootstrap mess + assign mess_admin role
      const { data: { session } } = await supabase.auth.getSession();
      const bootRes = await fetch(`${FUNCTIONS_URL}/bootstrap-mess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ mess_name: vals.mess_name }),
      });
      const bootJson = await bootRes.json();
      if (!bootRes.ok) throw new Error(bootJson.error || "Mess setup failed");

      toast.success("Welcome to MealKhata!");
      // Force a profile reload by reloading
      window.location.href = "/app";
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-subtle flex items-center justify-center p-4">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-glow/20 blur-3xl" />

      <div className="w-full max-w-md animate-fade-in">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-3">
            <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Start your mess</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your manager account</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-7 shadow-lg space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field id="full_name" label="Your Name" placeholder="Md. Karim" reg={register("full_name")} err={errors.full_name?.message} />
            <Field id="phone" label="Mobile Number" placeholder="017XXXXXXXX" reg={register("phone")} err={errors.phone?.message} />
            <Field id="password" type="password" label="Password" placeholder="••••••••" reg={register("password")} err={errors.password?.message} />
            <Field id="mess_name" label="Mess Name" placeholder="Sonali Mess" reg={register("mess_name")} err={errors.mess_name?.message} />

            <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary text-primary-foreground font-medium shadow-md hover:shadow-glow transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Mess & Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, placeholder, type = "text", reg, err }: any) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} className="h-11" {...reg} />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
