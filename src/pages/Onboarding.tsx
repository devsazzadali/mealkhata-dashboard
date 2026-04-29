import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-subtle">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!</h1>
        <p className="text-muted-foreground mb-6">
          Your account isn't linked to a mess yet. If you're the manager, finish setup below.
          Otherwise, ask your mess admin to add you.
        </p>
        <div className="space-y-2">
          <Link to="/signup">
            <Button className="w-full h-11 gradient-primary text-primary-foreground">Set up my mess</Button>
          </Link>
          <Button variant="outline" className="w-full h-11" onClick={() => signOut().then(() => navigate("/login"))}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
