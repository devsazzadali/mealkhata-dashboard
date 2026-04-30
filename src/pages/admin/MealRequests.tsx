import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, UtensilsCrossed, Coffee, Sun, Moon, Users, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function MealRequests() {
  const { profile, user } = useAuthStore();
  const messId = profile?.mess_id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["meal-requests", messId],
    enabled: !!messId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_requests")
        .select("*, boarders(full_name, photo_url)")
        .eq("mess_id", messId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!messId) return;
    const ch = supabase
      .channel(`mr-${messId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "meal_requests", filter: `mess_id=eq.${messId}` },
        () => qc.invalidateQueries({ queryKey: ["meal-requests", messId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [messId, qc]);

  const decide = async (r: any, action: "approved" | "rejected") => {
    const { error } = await supabase.from("meal_requests")
      .update({ status: action, decided_by: user?.id, decided_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);

    // If approved, also upsert into meal_entries
    if (action === "approved") {
      const { error: insErr } = await supabase.from("meal_entries").upsert({
        mess_id: r.mess_id,
        boarder_id: r.boarder_id,
        meal_date: r.request_date,
        breakfast: r.breakfast ? 1 : 0,
        lunch: r.lunch ? 1 : 0,
        dinner: r.dinner ? 1 : 0,
        guest: r.guest ?? 0,
        created_by: user?.id,
      } as any, { onConflict: "mess_id,boarder_id,meal_date" });
      if (insErr) toast.error("Approve হয়েছে কিন্তু meal entry update হয়নি: " + insErr.message);
    }
    toast.success(action === "approved" ? "Approve করা হয়েছে" : "Reject করা হয়েছে");
    qc.invalidateQueries({ queryKey: ["meal-requests", messId] });
  };

  const pending = (data ?? []).filter((r: any) => r.status === "pending");
  const decided = (data ?? []).filter((r: any) => r.status !== "pending");

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">মিল Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Boarders এর মিল on/off ও guest meal requests</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              অপেক্ষমান {pending.length > 0 && <Badge className="ml-2 h-5 px-1.5">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">ইতিহাস</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-2">
            {pending.length === 0 ? (
              <EmptyState text="কোনো অপেক্ষমান request নেই" />
            ) : pending.map((r: any) => (
              <RequestCard key={r.id} r={r} onApprove={() => decide(r, "approved")} onReject={() => decide(r, "rejected")} />
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            {decided.length === 0 ? (
              <EmptyState text="এখনও কোনো decision নেওয়া হয়নি" />
            ) : decided.map((r: any) => (
              <RequestCard key={r.id} r={r} readonly />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center">
      <UtensilsCrossed className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <p className="font-medium">{text}</p>
    </div>
  );
}

function RequestCard({ r, onApprove, onReject, readonly }: { r: any; onApprove?: () => void; onReject?: () => void; readonly?: boolean }) {
  const items: { label: string; icon: any }[] = [];
  if (r.breakfast) items.push({ label: "নাশতা", icon: Coffee });
  if (r.lunch) items.push({ label: "দুপুর", icon: Sun });
  if (r.dinner) items.push({ label: "রাত", icon: Moon });

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        {r.boarders?.photo_url ? (
          <img src={r.boarders.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
            {(r.boarders?.full_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{r.boarders?.full_name ?? "Unknown"}</p>
            <StatusBadge status={r.status} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(r.request_date), "dd MMM yyyy")}</span>
            <span>· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {items.map((it, i) => (
              <Badge key={i} variant="secondary" className="gap-1 font-normal">
                <it.icon className="w-3 h-3" /> {it.label}
              </Badge>
            ))}
            {r.guest > 0 && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Users className="w-3 h-3" /> Guest × {r.guest}
              </Badge>
            )}
            {items.length === 0 && r.guest === 0 && (
              <span className="text-xs text-muted-foreground italic">কোনো বেলা নির্বাচন নেই</span>
            )}
          </div>
          {r.note && <p className="text-sm mt-2 italic text-foreground/80">"{r.note}"</p>}
        </div>
        {!readonly && r.status === "pending" && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onReject}><X className="w-4 h-4" /></Button>
            <Button size="sm" onClick={onApprove}><Check className="w-4 h-4 mr-1" /> Approve</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-success/15 text-success border-success/30">Approved</Badge>;
  if (status === "rejected") return <Badge variant="outline" className="border-destructive/40 text-destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}
