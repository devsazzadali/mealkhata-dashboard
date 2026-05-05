import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatBdt } from "@/lib/phone";
import { currentPeriod, periodRange } from "@/lib/period";

const CATEGORIES = [
  { value: "electricity", label: "⚡ বিদ্যুৎ বিল" },
  { value: "gas", label: "🔥 গ্যাস বিল" },
  { value: "water", label: "💧 পানি বিল" },
  { value: "wifi", label: "📶 ওয়াইফাই" },
  { value: "rent", label: "🏠 বাসা ভাড়া" },
  { value: "service", label: "🧹 সার্ভিস চার্জ" },
  { value: "other", label: "💼 অন্যান্য" },
];

type FormState = {
  id?: string;
  title: string;
  category: string;
  amount: string;
  bill_date: string;
  split_method: "equal" | "meal_ratio";
  notes: string;
};

const empty: FormState = {
  title: "",
  category: "electricity",
  amount: "",
  bill_date: new Date().toISOString().slice(0, 10),
  split_method: "equal",
  notes: "",
};

export default function ExtraBills() {
  const messId = useAuthStore((s) => s.profile?.mess_id);
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const { year, month } = currentPeriod();
  const { start, end } = periodRange(year, month);

  const { data: bills, isLoading } = useQuery({
    queryKey: ["extra_bills", messId, start, end],
    enabled: !!messId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_bills")
        .select("*")
        .eq("mess_id", messId!)
        .gte("bill_date", start)
        .lt("bill_date", end)
        .order("bill_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = (bills ?? []).reduce((s, b: any) => s + Number(b.amount), 0);

  const handleSubmit = async () => {
    if (!messId) return;
    if (!form.title.trim() || !form.amount) return toast.error("Title ও amount দরকার");
    const payload = {
      mess_id: messId,
      title: form.title.trim(),
      category: form.category,
      amount: Number(form.amount),
      bill_date: form.bill_date,
      split_method: form.split_method,
      notes: form.notes || null,
      created_by: userId,
    };
    const { error } = form.id
      ? await supabase.from("extra_bills").update(payload).eq("id", form.id)
      : await supabase.from("extra_bills").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Updated" : "Added");
    setOpen(false);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["extra_bills"] });
  };

  const handleEdit = (b: any) => {
    setForm({
      id: b.id,
      title: b.title,
      category: b.category ?? "other",
      amount: String(b.amount),
      bill_date: b.bill_date,
      split_method: b.split_method,
      notes: b.notes ?? "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bill?")) return;
    const { error } = await supabase.from("extra_bills").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["extra_bills"] });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Extra Bills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            বিদ্যুৎ, গ্যাস, ওয়াইফাই, ভাড়া · এই মাসে: <span className="font-semibold text-foreground">{formatBdt(total)}</span>
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button className="shadow-glow gap-2"><Plus className="w-4 h-4" /> Add Bill</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Extra Bill</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="e.g. October Electricity"
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (BDT)</Label>
                  <Input type="number" step="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bill Date</Label>
                  <Input type="date" value={form.bill_date}
                    onChange={(e) => setForm({ ...form, bill_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Split Method</Label>
                  <Select value={form.split_method} onValueChange={(v: any) => setForm({ ...form, split_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equal">সমান ভাগে (head count)</SelectItem>
                      <SelectItem value="meal_ratio">মিল অনুযায়ী</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit}>{form.id ? "Update" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : !bills || bills.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No extra bills this month</p>
          <p className="text-sm text-muted-foreground mt-1">বিদ্যুৎ, গ্যাস, ওয়াইফাই বিল add করুন।</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card divide-y overflow-hidden">
          {bills.map((b: any) => {
            const cat = CATEGORIES.find((c) => c.value === b.category);
            return (
              <div key={b.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{b.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {b.split_method === "equal" ? "সমান" : "মিল অনুযায়ী"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {cat?.label ?? b.category} · {b.bill_date}{b.notes ? ` · ${b.notes}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatBdt(Number(b.amount))}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleEdit(b)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
