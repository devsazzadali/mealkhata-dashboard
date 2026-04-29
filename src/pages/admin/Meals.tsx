import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Save, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  boarder_id: string;
  full_name: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  entry_id?: string;
};

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Meals() {
  const messId = useAuthStore((s) => s.profile?.mess_id);
  const qc = useQueryClient();
  const [date, setDate] = useState(fmt(new Date()));
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["meals", messId, date],
    enabled: !!messId,
    queryFn: async () => {
      const [boardersRes, entriesRes] = await Promise.all([
        supabase
          .from("boarders")
          .select("id, full_name")
          .eq("mess_id", messId!)
          .eq("status", "active")
          .order("full_name"),
        supabase
          .from("meal_entries")
          .select("id, boarder_id, breakfast, lunch, dinner")
          .eq("mess_id", messId!)
          .eq("meal_date", date),
      ]);
      if (boardersRes.error) throw boardersRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const byBoarder = new Map(entriesRes.data?.map((e) => [e.boarder_id, e]));
      const rows: Record<string, Row> = {};
      for (const b of boardersRes.data ?? []) {
        const e = byBoarder.get(b.id);
        rows[b.id] = {
          boarder_id: b.id,
          full_name: b.full_name,
          breakfast: Number(e?.breakfast ?? 0),
          lunch: Number(e?.lunch ?? 0),
          dinner: Number(e?.dinner ?? 0),
          entry_id: e?.id,
        };
      }
      setDraft(rows);
      return rows;
    },
  });

  const totals = useMemo(() => {
    const list = Object.values(draft);
    const t = list.reduce(
      (a, r) => ({
        b: a.b + r.breakfast,
        l: a.l + r.lunch,
        d: a.d + r.dinner,
      }),
      { b: 0, l: 0, d: 0 }
    );
    return { ...t, all: t.b + t.l + t.d, count: list.length };
  }, [draft]);

  const setVal = (id: string, key: "breakfast" | "lunch" | "dinner", v: number) => {
    setDraft((d) => ({ ...d, [id]: { ...d[id], [key]: Math.max(0, v) } }));
  };

  const shiftDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(fmt(d));
  };

  const saveAll = async () => {
    if (!messId) return;
    setSaving(true);
    const rows = Object.values(draft);
    const payload = rows.map((r) => ({
      mess_id: messId,
      boarder_id: r.boarder_id,
      meal_date: date,
      breakfast: r.breakfast,
      lunch: r.lunch,
      dinner: r.dinner,
    }));
    // Upsert by (mess_id, boarder_id, meal_date) — need composite uniqueness handled by deletion+insert fallback
    // Simpler: delete then insert for this date+mess
    const del = await supabase
      .from("meal_entries")
      .delete()
      .eq("mess_id", messId)
      .eq("meal_date", date);
    if (del.error) {
      toast.error(del.error.message);
      setSaving(false);
      return;
    }
    const nonZero = payload.filter((p) => p.breakfast || p.lunch || p.dinner);
    if (nonZero.length > 0) {
      const ins = await supabase.from("meal_entries").insert(nonZero);
      if (ins.error) {
        toast.error(ins.error.message);
        setSaving(false);
        return;
      }
    }
    toast.success("Meals saved");
    qc.invalidateQueries({ queryKey: ["meals", messId, date] });
    qc.invalidateQueries({ queryKey: ["mess-dashboard", messId] });
    qc.invalidateQueries({ queryKey: ["month-stats"] });
    setSaving(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Meals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tap a count to edit. Save when done.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[160px]"
          />
          <Button variant="outline" size="icon" onClick={() => shiftDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Breakfast" value={totals.b} />
        <StatTile label="Lunch" value={totals.l} />
        <StatTile label="Dinner" value={totals.d} />
        <StatTile label="Total Meals" value={totals.all} highlight />
      </div>

      {isLoading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : !data || Object.keys(data).length === 0 ? (
        <EmptyBoarders />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr,90px,90px,90px,90px] gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
            <div>Boarder</div>
            <div className="text-center">Breakfast</div>
            <div className="text-center">Lunch</div>
            <div className="text-center">Dinner</div>
            <div className="text-center">Total</div>
          </div>
          <div className="divide-y">
            {Object.values(draft).map((r) => {
              const total = r.breakfast + r.lunch + r.dinner;
              return (
                <div
                  key={r.boarder_id}
                  className="grid grid-cols-[1fr,60px,60px,60px] md:grid-cols-[1fr,90px,90px,90px,90px] gap-2 px-3 md:px-4 py-3 items-center"
                >
                  <div className="font-medium text-sm truncate">{r.full_name}</div>
                  <MealStepper
                    label="B"
                    value={r.breakfast}
                    onChange={(v) => setVal(r.boarder_id, "breakfast", v)}
                  />
                  <MealStepper
                    label="L"
                    value={r.lunch}
                    onChange={(v) => setVal(r.boarder_id, "lunch", v)}
                  />
                  <MealStepper
                    label="D"
                    value={r.dinner}
                    onChange={(v) => setVal(r.boarder_id, "dinner", v)}
                  />
                  <div className="hidden md:block text-center text-sm font-semibold tabular-nums">
                    {total}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="sticky bottom-20 md:bottom-4 flex justify-end">
        <Button size="lg" onClick={saveAll} disabled={saving} className="shadow-glow">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save Meals"}
        </Button>
      </div>
    </div>
  );
}

function MealStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        onClick={() => onChange(value - 0.5)}
      >
        −
      </Button>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 text-center px-1 tabular-nums"
        aria-label={label}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        onClick={() => onChange(value + 0.5)}
      >
        +
      </Button>
    </div>
  );
}

function StatTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded-2xl p-4 border " +
        (highlight ? "bg-primary text-primary-foreground border-transparent shadow-glow" : "bg-card")
      }
    >
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}

function EmptyBoarders() {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center">
      <UtensilsCrossed className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <p className="font-medium">No active boarders yet</p>
      <p className="text-sm text-muted-foreground mt-1">Add boarders first to record meals.</p>
    </div>
  );
}
