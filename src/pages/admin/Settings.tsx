import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const messId = useAuthStore((s) => s.profile?.mess_id);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    default_meal_rate: "0",
    low_balance_threshold: "100",
    bkash_number: "",
    nagad_number: "",
    bank_info: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["mess-settings", messId],
    enabled: !!messId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mess_settings")
        .select("*")
        .eq("mess_id", messId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: mess } = useQuery({
    queryKey: ["mess", messId],
    enabled: !!messId,
    queryFn: async () => {
      const { data } = await supabase.from("messes").select("*").eq("id", messId!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        default_meal_rate: String(settings.default_meal_rate ?? 0),
        low_balance_threshold: String(settings.low_balance_threshold ?? 100),
        bkash_number: settings.bkash_number ?? "",
        nagad_number: settings.nagad_number ?? "",
        bank_info: settings.bank_info ?? "",
      });
    }
  }, [settings]);

  async function handleSave() {
    if (!messId) return;
    setSaving(true);
    const { error } = await supabase
      .from("mess_settings")
      .update({
        default_meal_rate: Number(form.default_meal_rate) || 0,
        low_balance_threshold: Number(form.low_balance_threshold) || 0,
        bkash_number: form.bkash_number || null,
        nagad_number: form.nagad_number || null,
        bank_info: form.bank_info || null,
      })
      .eq("mess_id", messId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["mess-settings", messId] });
  }

  async function regenerateKey() {
    if (!messId) return;
    const newKey = Math.random().toString(36).slice(2, 10);
    const { error } = await supabase
      .from("mess_settings")
      .update({ join_key: newKey })
      .eq("mess_id", messId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Join key regenerated");
    qc.invalidateQueries({ queryKey: ["mess-settings", messId] });
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">{mess?.name}</p>
      </div>

      {/* Join Key */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div>
          <h3 className="font-semibold">Mess Join Key</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Share this key with new boarders. They sign up and use it to request joining your mess.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-4 py-3 rounded-xl bg-muted font-mono text-lg tracking-wider text-center">
            {settings?.join_key ?? "—"}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(settings?.join_key ?? "");
              toast.success("Copied");
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={regenerateKey} title="Regenerate">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Financial settings */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Financial</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate">Default Meal Rate (৳)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              value={form.default_meal_rate}
              onChange={(e) => setForm({ ...form, default_meal_rate: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">Used as fallback if no expenses yet this month.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lowbal">Low Balance Alert (৳)</Label>
            <Input
              id="lowbal"
              type="number"
              step="1"
              value={form.low_balance_threshold}
              onChange={(e) => setForm({ ...form, low_balance_threshold: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">Boarder gets alert when balance falls below this.</p>
          </div>
        </div>
      </div>

      {/* Payment numbers */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Payment Numbers</h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Boarders will see these to send deposits.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bkash">bKash Number</Label>
            <Input
              id="bkash"
              placeholder="01XXXXXXXXX"
              value={form.bkash_number}
              onChange={(e) => setForm({ ...form, bkash_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nagad">Nagad Number</Label>
            <Input
              id="nagad"
              placeholder="01XXXXXXXXX"
              value={form.nagad_number}
              onChange={(e) => setForm({ ...form, nagad_number: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank">Bank Account Info</Label>
          <Textarea
            id="bank"
            rows={2}
            placeholder="Bank name, account number, branch..."
            value={form.bank_info}
            onChange={(e) => setForm({ ...form, bank_info: e.target.value })}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
