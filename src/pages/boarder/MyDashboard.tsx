import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, UtensilsCrossed, AlertCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBdt } from "@/lib/phone";

export default function MyDashboard() {
  const userId = useAuthStore((s) => s.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ["my-dashboard", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: boarder } = await supabase
        .from("boarders")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (!boarder) return null;

      const monthStart = new Date();
      monthStart.setDate(1);
      const ms = monthStart.toISOString().slice(0, 10);

      const [meals, deposits] = await Promise.all([
        supabase.from("meal_entries").select("breakfast, lunch, dinner").eq("boarder_id", boarder.id).gte("meal_date", ms),
        supabase.from("deposits").select("amount").eq("boarder_id", boarder.id).gte("deposit_date", ms),
      ]);
      const totalMeals = (meals.data ?? []).reduce(
        (s, m) => s + Number(m.breakfast) + Number(m.lunch) + Number(m.dinner),
        0
      );
      const monthDeposit = (deposits.data ?? []).reduce((s, d) => s + Number(d.amount), 0);

      return { boarder, totalMeals, monthDeposit };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">No boarder profile linked to your account yet. Please contact your mess admin.</p>
      </div>
    );
  }

  const { boarder, totalMeals, monthDeposit } = data;
  const balance = Number(boarder.balance);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hi, {boarder.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Your meal & balance overview</p>
      </div>

      <div className="rounded-2xl p-6 gradient-hero text-primary-foreground shadow-glow">
        <p className="text-sm uppercase tracking-wide opacity-80">Current Balance</p>
        <p className="text-4xl font-bold mt-2 tabular-nums">{formatBdt(balance)}</p>
        {balance < 0 && <p className="text-xs mt-2 opacity-90">⚠ You have a due amount. Please deposit soon.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Meals This Month" value={String(totalMeals)} icon={UtensilsCrossed} tone="primary" />
        <StatCard label="Deposit This Month" value={formatBdt(monthDeposit)} icon={Wallet} tone="success" />
        <StatCard label="Monthly Target" value={formatBdt(boarder.monthly_deposit)} icon={Calendar} />
        <StatCard label="Status" value={boarder.status} icon={AlertCircle} tone={boarder.status === "active" ? "success" : "warning"} />
      </div>
    </div>
  );
}
