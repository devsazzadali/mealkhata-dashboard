import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, getPrimaryRole, type AppRole } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allow?: AppRole[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const { initialized, session, roles, loading } = useAuthStore();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;

  if (allow && !roles.some((r) => allow.includes(r))) {
    const primary = getPrimaryRole(roles);
    if (primary) return <Navigate to={routeForRole(primary)} replace />;
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export function routeForRole(role: AppRole): string {
  if (role === "super_admin") return "/super";
  if (role === "mess_admin") return "/app";
  return "/me";
}
