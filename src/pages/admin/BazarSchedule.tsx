import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function BazarSchedule() {
  const messId = useAuthStore((s) => s.profile?.mess_id);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [boarderId, setBoarderId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const { data: boarders } = useQuery({
    queryKey: ["boarders-active", messId],
    enabled: !!messId,
    queryFn: async () => {
      const { data } = await supabase.from("boarders").select("id, full_name")
        .eq("mess_id", messId!).eq("status", "active").order("full_name");
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["bazar-schedule", messId],
    enabled: !!messId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bazar_schedule")
        .select("*, boarders(full_name)")
        .eq("mess_id", messId!)
        .order("schedule_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const add = async () => {
    if (!boarderId || !date || !messId) return toast.error("সব ফিল্ড পূরণ করুন");
    const { error } = await supabase.from("bazar_schedule").insert({
      mess_id: messId, boarder_id: boarderId, schedule_date: date, notes: notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("শিডিউল যোগ হয়েছে");
    setOpen(false); setBoarderId(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["bazar-schedule", messId] });
  };

  const toggleDone = async (id: string, done: boolean) => {
    await supabase.from("bazar_schedule").update({ done: !done }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["bazar-schedule", messId] });
  };

  const remove = async (id: string) => {
    await supabase.from("bazar_schedule").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["bazar-schedule", messId] });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">বাজার শিডিউল</h1>
          <p className="text-sm text-muted-foreground mt-1">কোন তারিখে কে বাজার করবে</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> নতুন</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>বাজার শিডিউল</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>সদস্য</Label>
                <Select value={boarderId} onValueChange={setBoarderId}>
                  <SelectTrigger><SelectValue placeholder="সদস্য বাছাই" /></SelectTrigger>
                  <SelectContent>
                    {boarders?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>তারিখ</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>নোট (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="মাছ, সবজি..." />
              </div>
              <Button onClick={add} className="w-full">যোগ করুন</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Skeleton className="h-72 rounded-2xl" /> : !data?.length ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">কোনো শিডিউল নেই</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((s: any) => (
            <div key={s.id} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{s.boarders?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(s.schedule_date), "dd MMM yyyy")}
                  {s.notes && ` · ${s.notes}`}
                </p>
              </div>
              <Badge variant={s.done ? "default" : "outline"}>{s.done ? "Done" : "Pending"}</Badge>
              <Button size="icon" variant="outline" onClick={() => toggleDone(s.id, s.done)}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => remove(s.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
