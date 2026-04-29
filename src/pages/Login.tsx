import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UtensilsCrossed, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { isValidBdPhone, phoneToEmail, normalizePhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  phone: z.string().refine(isValidBdPhone, "Enter a valid Bangladeshi mobile (e.g. 017XXXXXXXX)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormVals = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { session, initialized } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", password: "" },
  });

  if (initialized && session) return <Navigate to="/app" replace />;

  const onSubmit = async (vals: FormVals) => {
    setSubmitting(true);
    const email = phoneToEmail(vals.phone);
    const { error } = await supabase.auth.signInWithPassword({ email, password: vals.password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("Invalid") ? "Invalid phone or password" : error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-subtle flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-glow/20 blur-3xl" />

      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4">
            <UtensilsCrossed className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Meal<span className="text-gradient">Khata</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Smart mess management for Bangladesh</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-6">Use your registered mobile number</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="017XXXXXXXX"
                  className="pl-9 h-11"
                  {...register("phone")}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-11"
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary text-primary-foreground font-medium shadow-md hover:shadow-glow transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            নতুন ব্যবহারকারী?{" "}
            <a href="/signup" className="text-primary font-medium hover:underline">
              রেজিস্টার করুন
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Need a demo? Use the bootstrap link on this page after signing up the first manager.
        </p>
      </div>
    </div>
  );
}
