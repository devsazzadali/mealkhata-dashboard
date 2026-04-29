import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Mic, Phone, Pin, PinOff, Send, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CALL_PREFIX = "📞 CALL_INVITE:";

export default function Chat() {
  const { user, profile, roles } = useAuthStore();
  const messId = profile?.mess_id ?? null;
  const isAdmin = roles.includes("mess_admin") || roles.includes("super_admin");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // load messages + sender profiles
  const { data, isLoading } = useQuery({
    queryKey: ["chat", messId],
    enabled: !!messId,
    queryFn: async () => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .eq("mess_id", messId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      const senderIds = Array.from(new Set((msgs ?? []).map((m) => m.sender_id)));
      const { data: profs } = senderIds.length
        ? await supabase.from("profiles").select("id, full_name, photo_url").in("id", senderIds)
        : { data: [] as any[] };
      const profMap: Record<string, any> = {};
      for (const p of profs ?? []) profMap[p.id] = p;

      // Read receipts: count distinct readers per message
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id, user_id")
        .in("message_id", (msgs ?? []).map((m) => m.id));
      const readsMap: Record<string, Set<string>> = {};
      for (const r of reads ?? []) {
        readsMap[r.message_id] ??= new Set();
        readsMap[r.message_id].add(r.user_id);
      }

      return { msgs: msgs ?? [], profMap, readsMap };
    },
  });

  // realtime subscription
  useEffect(() => {
    if (!messId) return;
    const ch = supabase
      .channel(`chat-${messId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `mess_id=eq.${messId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat", messId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads" }, () => {
        qc.invalidateQueries({ queryKey: ["chat", messId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [messId, qc]);

  // mark unread as read
  useEffect(() => {
    if (!data || !user) return;
    const unread = data.msgs.filter(
      (m) => m.sender_id !== user.id && !data.readsMap[m.id]?.has(user.id),
    );
    if (unread.length === 0) return;
    supabase
      .from("message_reads")
      .upsert(
        unread.map((m) => ({ message_id: m.id, user_id: user.id })),
        { onConflict: "message_id,user_id", ignoreDuplicates: true },
      )
      .then(() => {});
  }, [data, user]);

  // auto-scroll to bottom on new
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.msgs.length]);

  const pinned = useMemo(() => (data?.msgs ?? []).filter((m) => m.is_pinned), [data?.msgs]);

  const send = async (image_url?: string) => {
    if (!messId || !user) return;
    const text = draft.trim();
    if (!text && !image_url) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      mess_id: messId,
      sender_id: user.id,
      content: text || null,
      image_url: image_url || null,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setDraft("");
  };

  const uploadImage = async (file: File) => {
    if (!user || !messId) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Image too large (max 8MB)");
    setSending(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${messId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("chat-images").getPublicUrl(path);
      await send(pub.publicUrl);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
      setSending(false);
    }
  };

  const togglePin = async (id: string, current: boolean) => {
    const { error } = await supabase.from("messages").update({ is_pinned: !current }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteMsg = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  if (!messId) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">Join a mess to use group chat.</p>
      </div>
    );
  }

  const startCall = async (kind: "video" | "audio") => {
    if (!messId || !user) return;
    const roomId = `mealkhata-${messId}-${Date.now().toString(36)}`;
    const callPath = `${window.location.origin}/call/${roomId}${kind === "audio" ? "?audio=1" : ""}`;
    // broadcast invite as a chat message
    await supabase.from("messages").insert({
      mess_id: messId,
      sender_id: user.id,
      content: `${CALL_PREFIX}${kind}:${roomId}`,
    });
    // open call
    const target = isAdmin ? `/app/call/${roomId}` : `/me/call/${roomId}`;
    navigate(`${target}${kind === "audio" ? "?audio=1" : ""}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] -mt-2">
      <div className="border-b pb-3 mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Mess Group Chat</h1>
          <p className="text-xs text-muted-foreground">Realtime · {data?.msgs.length ?? 0} messages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => startCall("audio")} className="gap-1.5">
            <Mic className="w-4 h-4" /> Audio
          </Button>
          <Button size="sm" onClick={() => startCall("video")} className="gap-1.5">
            <Video className="w-4 h-4" /> Video Call
          </Button>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-primary mb-1.5 flex items-center gap-1">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          {pinned.map((m) => (
            <p key={m.id} className="text-sm truncate">
              <span className="font-medium">{data?.profMap[m.sender_id]?.full_name ?? "User"}:</span>{" "}
              {m.content ?? "📷 photo"}
            </p>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : data?.msgs.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">No messages yet. Say hi! 👋</div>
        ) : (
          data?.msgs.map((m) => {
            const mine = m.sender_id === user?.id;
            const sender = data.profMap[m.sender_id];
            const readers = data.readsMap[m.id]?.size ?? 0;
            const isCallInvite = m.content?.startsWith(CALL_PREFIX);

            if (isCallInvite) {
              const [kind, roomId] = m.content!.slice(CALL_PREFIX.length).split(":");
              const audioOnly = kind === "audio";
              const target = `${isAdmin ? "/app" : "/me"}/call/${roomId}${audioOnly ? "?audio=1" : ""}`;
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 max-w-md w-full text-center">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2">
                      {audioOnly ? <Mic className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </div>
                    <p className="text-sm font-semibold">
                      {sender?.full_name ?? "Someone"} started a {audioOnly ? "audio" : "video"} call
                    </p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "HH:mm")}</p>
                    <Button size="sm" className="mt-3 gap-1.5" onClick={() => navigate(target)}>
                      <Phone className="w-3.5 h-3.5" /> Join Call
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id} className={cn("flex gap-2 group", mine && "flex-row-reverse")}>
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={sender?.photo_url} />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {(sender?.full_name ?? "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("max-w-[78%] sm:max-w-[60%]", mine && "items-end")}>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm relative",
                      mine
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border rounded-tl-sm",
                      m.is_pinned && "ring-2 ring-primary/40",
                    )}
                  >
                    {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{sender?.full_name ?? "User"}</p>}
                    {m.image_url && (
                      <img src={m.image_url} alt="" className="rounded-lg mb-1.5 max-h-64 object-cover" />
                    )}
                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                  </div>
                  <div className={cn("flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground", mine && "justify-end")}>
                    <span>{format(new Date(m.created_at), "HH:mm")}</span>
                    {mine && readers > 0 && <span>· read by {readers}</span>}
                    {(mine || isAdmin) && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {isAdmin && (
                          <button onClick={() => togglePin(m.id, m.is_pinned)} className="hover:text-foreground">
                            {m.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                          </button>
                        )}
                        <button onClick={() => deleteMsg(m.id)} className="hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
        />
        <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={sending}>
          <ImagePlus className="w-4 h-4" />
        </Button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message…"
          disabled={sending}
          className="flex-1"
        />
        <Button onClick={() => send()} disabled={sending || (!draft.trim())}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
