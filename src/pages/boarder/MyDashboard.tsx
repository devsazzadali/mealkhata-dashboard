import { useQuery } from "@tanstack/react-query";
import { Wallet, UtensilsCrossed, AlertCircle, Calendar, Megaphone, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBdt } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";

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

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const ms = new Date(year, month - 1, 1).toISOString().slice(0, 10);

      const [meals, deposits, statsRes, settingsRes, noticesRes] = await Promise.all([
        supabase.from("meal_entries").select("breakfast, lunch, dinner").eq("boarder_id", boarder.id).gte("meal_date", ms),
        supabase.from("deposits").select("amount").eq("boarder_id", boarder.id).gte("deposit_date", ms),
        supabase.rpc("get_month_stats", { _mess_id: boarder.mess_id, _year: year, _month: month }),
        supabase.from("mess_settings").select("*").eq("mess_id", boarder.mess_id).maybeSingle(),
        supabase.from("notices").select("*").eq("mess_id", boarder.mess_id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
      ]);
      const totalMeals = (meals.data ?? []).reduce(
        (s, m) => s + Number(m.breakfast) + Number(m.lunch) + Number(m.dinner),
        0
      );
      const monthDeposit = (deposits.data ?? []).reduce((s, d) => s + Number(d.amount), 0);
      const mealRate = Number(statsRes.data?.[0]?.meal_rate ?? 0);

      return { boarder, totalMeals, monthDeposit, mealRate, settings: settingsRes.data, notices: noticesRes.data ?? [] };
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

  const { boarder, totalMeals, monthDeposit, mealRate, settings, notices } = data;
  const balance = Number(boarder.balance);
  const monthCost = totalMeals * mealRate;
  const liveNet = monthDeposit - monthCost;
  const lowBalanceThreshold = Number(settings?.low_balance_threshold ?? 100);
  const isLowBalance = balance < lowBalanceThreshold;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hi, {boarder.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Your meal & balance overview</p>
      </div>

      {isLowBalance && (
        <div className="rounded-2xl border border-warning/50 bg-warning/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-warning-foreground">Low balance warning</p>
            <p className="text-sm text-foreground/80 mt-1">
              Your balance ({formatBdt(balance)}) is below {formatBdt(lowBalanceThreshold)}. Please deposit soon.
            </p>
            {(settings?.bkash_number || settings?.nagad_number) && (
              <div className="text-xs mt-2 space-y-0.5">
                {settings?.bkash_number && <p>📱 bKash: <span className="font-mono">{settings.bkash_number}</span></p>}
                {settings?.nagad_number && <p>📱 Nagad: <span className="font-mono">{settings.nagad_number}</span></p>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-6 gradient-hero text-primary-foreground shadow-glow">
        <p className="text-sm uppercase tracking-wide opacity-80">Current Balance</p>
        <p className="text-4xl font-bold mt-2 tabular-nums">{formatBdt(balance)}</p>
        <p className="text-xs mt-2 opacity-90">
          This month live: {formatBdt(liveNet)} ({totalMeals} meals × {formatBdt(mealRate)})
        </p>
        {balance < 0 && <p className="text-xs mt-2 opacity-90">⚠ You have a due amount. Please deposit soon.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Meals This Month" value={String(totalMeals)} icon={UtensilsCrossed} tone="primary" />
        <StatCard label="Deposit This Month" value={formatBdt(monthDeposit)} icon={Wallet} tone="success" />
        <StatCard label="Meal Rate (live)" value={formatBdt(mealRate)} hint="per meal" icon={Calendar} />
        <StatCard label="Status" value={boarder.status} icon={AlertCircle} tone={boarder.status === "active" ? "success" : "warning"} />
      </div>

      {notices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4" /> Latest Notices</h2>
          {notices.map((n: any) => (
            <div key={n.id} className={`rounded-2xl border bg-card p-4 ${n.is_pinned ? "border-primary/50" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">{n.title}</h3>
                {n.is_pinned && <Badge variant="outline" className="border-primary text-primary gap-1 text-[10px]"><Pin className="w-2.5 h-2.5" /> Pinned</Badge>}
              </div>
              <p className="text-sm text-foreground/80 mt-1.5 whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

