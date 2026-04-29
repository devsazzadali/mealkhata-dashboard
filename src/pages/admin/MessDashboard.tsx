import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Wallet, Receipt, AlertCircle, TrendingUp, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { StatCard } from "@/components/ui/stat-card";
import { formatBdt } from "@/lib/phone";
import { Skeleton } from "@/components/ui/skeleton";

export default function MessDashboard() {
  const messId = useAuthStore((s) => s.profile?.mess_id);

  const { data, isLoading } = useQuery({
    queryKey: ["mess-dashboard", messId],
    enabled: !!messId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const monthStart = startOfMonth.toISOString().slice(0, 10);

      const [boarders, expensesMonth, expensesToday, deposits] = await Promise.all([
        supabase.from("boarders").select("id, balance, status").eq("mess_id", messId!),
        supabase.from("expenses").select("amount").eq("mess_id", messId!).gte("expense_date", monthStart),
        supabase.from("expenses").select("amount").eq("mess_id", messId!).eq("expense_date", today),
        supabase.from("deposits").select("amount").eq("mess_id", messId!).gte("deposit_date", monthStart),
      ]);

      const active = (boarders.data ?? []).filter((b) => b.status === "active");
      const totalBalance = (boarders.data ?? []).reduce((s, b) => s + Number(b.balance), 0);
      const totalDue = (boarders.data ?? []).reduce(
        (s, b) => s + (Number(b.balance) < 0 ? -Number(b.balance) : 0),
        0
      );
      const monthExpense = (expensesMonth.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
      const todayExpense = (expensesToday.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
      const monthDeposit = (deposits.data ?? []).reduce((s, d) => s + Number(d.amount), 0);

      return {
        totalBoarders: active.length,
        allBoarders: (boarders.data ?? []).length,
        totalBalance,
        totalDue,
        monthExpense,
        todayExpense,
        monthDeposit,
      };
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">A quick look at your mess today</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Active Boarders" value={String(data?.totalBoarders ?? 0)} hint={`${data?.allBoarders ?? 0} total`} icon={Users} tone="primary" />
            <StatCard label="Total Balance" value={formatBdt(data?.totalBalance ?? 0)} icon={Wallet} tone="success" />
            <StatCard label="Total Due" value={formatBdt(data?.totalDue ?? 0)} icon={AlertCircle} tone="destructive" />
            <StatCard label="This Month Expense" value={formatBdt(data?.monthExpense ?? 0)} icon={Receipt} tone="warning" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Today Expense" value={formatBdt(data?.todayExpense ?? 0)} icon={Receipt} />
            <StatCard label="Monthly Deposit" value={formatBdt(data?.monthDeposit ?? 0)} icon={TrendingUp} tone="success" />
            <StatCard label="Per Meal Cost" value="—" hint="Add meals to calculate" icon={UtensilsCrossed} />
            <StatCard label="Rice Stock" value="—" hint="Phase 2" icon={UtensilsCrossed} />
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold mb-1">More coming soon</h3>
            <p className="text-sm text-muted-foreground">
              Meals, expenses, deposits, stock and notices are wired into the database. We'll bring full editing
              flows in the next phase. Start by adding your boarders.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
