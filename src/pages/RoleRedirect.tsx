import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore, getPrimaryRole } from "@/stores/authStore";
import { Loader2 } from "lucide-react";
import { routeForRole } from "@/components/auth/ProtectedRoute";

/** Decides where to send the user after login based on their role. */
export default function RoleRedirect() {
  const { initialized, session, roles, profile, loading } = useAuthStore();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  const primary = getPrimaryRole(roles);
  if (!primary) return <Navigate to="/onboarding" replace />;

  // Super admins or mess admins without a mess yet → onboarding to create one
  if ((primary === "super_admin" || primary === "mess_admin") && !profile?.mess_id) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to={routeForRole(primary)} replace />;
}
