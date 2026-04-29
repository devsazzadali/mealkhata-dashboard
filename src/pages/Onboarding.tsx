import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Building2, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Onboarding() {
  const navigate = useNavigate();
  const { signOut, profile, user, loadProfileAndRoles } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  // Create mess
  const [messName, setMessName] = useState("");
  const [address, setAddress] = useState("");

  // Join mess
  const [joinKey, setJoinKey] = useState("");
  const [joinName, setJoinName] = useState(profile?.full_name ?? "");
  const [joinPhone, setJoinPhone] = useState(profile?.phone ?? "");
  const [joinMsg, setJoinMsg] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const createMess = async () => {
    if (!messName.trim()) return toast.error("Enter mess name");
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bootstrap-mess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ mess_name: messName.trim(), address: address || undefined }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) return toast.error(json.error || "Failed");
    toast.success("Mess created!");
    await loadProfileAndRoles();
    window.location.href = "/app";
  };

  const requestJoin = async () => {
    if (!user) return;
    if (!joinKey.trim() || !joinName.trim() || !joinPhone.trim()) {
      return toast.error("Fill all fields");
    }
    setSubmitting(true);
    // Find mess by join_key
    const { data: settings } = await supabase
      .from("mess_settings")
      .select("mess_id")
      .eq("join_key", joinKey.trim().toLowerCase())
      .maybeSingle();
    if (!settings?.mess_id) {
      setSubmitting(false);
      return toast.error("Invalid join key");
    }
    const { error } = await supabase.from("join_requests").insert({
      mess_id: settings.mess_id,
      user_id: user.id,
      requested_name: joinName.trim(),
      requested_phone: joinPhone.trim(),
      message: joinMsg.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent! Wait for admin approval.");
    setRequestSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-subtle">
      <div className="w-full max-w-lg space-y-4 animate-fade-in">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold">Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a new mess or join an existing one.</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-md">
          {requestSent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <p className="font-semibold">Request sent</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your join request is pending. The mess admin will approve you soon.
                Refresh this page after approval.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          ) : (
            <Tabs defaultValue="join">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="join"><KeyRound className="w-4 h-4 mr-1.5" /> Join Mess</TabsTrigger>
                <TabsTrigger value="create"><Building2 className="w-4 h-4 mr-1.5" /> Create Mess</TabsTrigger>
              </TabsList>

              <TabsContent value="join" className="space-y-3 mt-4">
                <p className="text-xs text-muted-foreground">Enter the 8-char key shared by your mess admin.</p>
                <div className="space-y-1.5">
                  <Label>Join key</Label>
                  <Input value={joinKey} onChange={(e) => setJoinKey(e.target.value)} placeholder="abc12def" maxLength={8} className="font-mono uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Your name</Label>
                    <Input value={joinName} onChange={(e) => setJoinName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={joinPhone} onChange={(e) => setJoinPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Message (optional)</Label>
                  <Input value={joinMsg} onChange={(e) => setJoinMsg(e.target.value)} placeholder="Hi, I'd like to join…" />
                </div>
                <Button className="w-full h-11" onClick={requestJoin} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send join request"}
                </Button>
              </TabsContent>

              <TabsContent value="create" className="space-y-3 mt-4">
                <p className="text-xs text-muted-foreground">You'll become the manager of this new mess.</p>
                <div className="space-y-1.5">
                  <Label>Mess name *</Label>
                  <Input value={messName} onChange={(e) => setMessName(e.target.value)} placeholder="Sonali Mess" />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mirpur 10, Dhaka" />
                </div>
                <Button className="w-full h-11 gradient-primary text-primary-foreground" onClick={createMess} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create mess"}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <Button variant="ghost" className="w-full" onClick={() => signOut().then(() => navigate("/login"))}>
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}
