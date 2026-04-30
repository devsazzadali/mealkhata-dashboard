import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyBazar() {
  const messId = useAuthStore((s) => s.profile?.mess_id);
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["bazar-schedule-boarder", messId],
    enabled: !!messId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bazar_schedule")
        .select("*, boarders(full_name, photo_url)")
        .eq("mess_id", messId!)
        .gte("schedule_date", today)
        .order("schedule_date", { ascending: true })
        .limit(20);
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-5 animate-fade-in pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">বাজার শিডিউল</h1>
        <p className="text-sm text-muted-foreground mt-1">আগামী দিনগুলোতে কে বাজার করবে</p>
      </div>

      {data?.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">এখনও কোনো শিডিউল নেই।</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.map((s: any) => (
            <div key={s.id} className="rounded-xl border bg-card p-3 flex items-center gap-3">
              {s.boarders?.photo_url ? (
                <img src={s.boarders.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {(s.boarders?.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.boarders?.full_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(s.schedule_date), "dd MMM yyyy, EEEE")}</p>
                {s.notes && <p className="text-xs text-foreground/80 mt-0.5">{s.notes}</p>}
              </div>
              {s.done ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
