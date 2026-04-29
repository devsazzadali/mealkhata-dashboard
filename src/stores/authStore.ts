import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "mess_admin" | "boarder";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  photo_url: string | null;
  mess_id: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  initialized: boolean;
  setSession: (s: Session | null) => void;
  loadProfileAndRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  loadProfileAndRoles: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null, roles: [], loading: false });
      return;
    }
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    set({
      profile: profile as Profile | null,
      roles: (roles ?? []).map((r: any) => r.role as AppRole),
      loading: false,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, roles: [] });
  },
}));

export function getPrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("mess_admin")) return "mess_admin";
  if (roles.includes("boarder")) return "boarder";
  return null;
}
