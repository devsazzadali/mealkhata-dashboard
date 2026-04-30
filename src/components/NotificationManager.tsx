import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationSound } from "@/hooks/useNotificationSound";

/**
 * Subscribes to realtime events for the current user's mess and triggers
 * in-app notification sounds + toast notifications.
 *
 * Events handled:
 *  - new chat messages (skipped if user is on /chat page or sender)
 *  - emergency notices (always)
 *  - meal_request status updated (boarder hears when their request is decided)
 */
export default function NotificationManager() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const messId = profile?.mess_id;
  const userId = user?.id;
  const { play } = useNotificationSound();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!messId || !userId) return;

    const ch = supabase
      .channel(`notify-${messId}-${userId}`)
      // New chat messages
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `mess_id=eq.${messId}` },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === userId) return; // own message
          if (pathnameRef.current.endsWith("/chat")) return; // already on chat
          play("message");
          toast("নতুন মেসেজ এসেছে", {
            description: msg.content?.slice(0, 80) ?? "📷 ছবি",
          });
        }
      )
      // Emergency notices
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notices", filter: `mess_id=eq.${messId}` },
        (payload) => {
          const n = payload.new as any;
          if (!n.is_emergency) return;
          play("emergency");
          toast.error(`🚨 জরুরি: ${n.title}`, {
            description: n.content?.slice(0, 120),
            duration: 10000,
          });
        }
      )
      // Meal request decision (own requests)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "meal_requests", filter: `user_id=eq.${userId}` },
        (payload) => {
          const before = payload.old as any;
          const after = payload.new as any;
          if (before.status === after.status) return;
          if (after.status === "approved" || after.status === "rejected") {
            play("request");
            const ok = after.status === "approved";
            toast[ok ? "success" : "warning"](
              ok ? "আপনার মিল request approve হয়েছে" : "আপনার মিল request reject হয়েছে",
              { icon: <Megaphone className="w-4 h-4" /> }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [messId, userId, play]);

  return null;
}
