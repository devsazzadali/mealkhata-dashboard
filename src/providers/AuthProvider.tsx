import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

/** Initializes Supabase auth listener + initial session load. Mount once at root. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const loadProfileAndRoles = useAuthStore((s) => s.loadProfileAndRoles);

  useEffect(() => {
    // 1. Subscribe FIRST (per Supabase best practice)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Defer extra fetches to avoid deadlock with the auth callback
      setTimeout(() => {
        useAuthStore.setState({ loading: true });
        loadProfileAndRoles().finally(() =>
          useAuthStore.setState({ initialized: true })
        );
      }, 0);
    });

    // 2. Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfileAndRoles().finally(() =>
        useAuthStore.setState({ initialized: true })
      );
    });

    return () => sub.subscription.unsubscribe();
  }, [setSession, loadProfileAndRoles]);

  return <>{children}</>;
}
