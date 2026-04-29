import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { isValidBdPhone, normalizePhone } from "@/lib/phone";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  full_name: z.string().trim().min(2, "Required").max(80),
  phone: z.string().refine(isValidBdPhone, "Valid BD mobile required (017XXXXXXXX)"),
  password: z.string().min(6, "At least 6 characters"),
  guardian_name: z.string().max(80).optional().or(z.literal("")),
  guardian_phone: z.string().optional().or(z.literal("")),
  seat_number: z.string().max(20).optional().or(z.literal("")),
  monthly_deposit: z.coerce.number().min(0).optional(),
  notes: z.string().max(300).optional().or(z.literal("")),
});
type Vals = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreateBoarderDialog({ open, onOpenChange }: Props) {
  const messId = useAuthStore((s) => s.profile?.mess_id);
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Vals>({
    resolver: zodResolver(schema),
    defaultValues: { monthly_deposit: 0 },
  });

  const onSubmit = async (vals: Vals) => {
    if (!messId) return toast.error("No mess assigned");
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-boarder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          full_name: vals.full_name,
          phone: normalizePhone(vals.phone),
          password: vals.password,
          guardian_name: vals.guardian_name || undefined,
          guardian_phone: vals.guardian_phone || undefined,
          seat_number: vals.seat_number || undefined,
          monthly_deposit: vals.monthly_deposit ?? 0,
          notes: vals.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create boarder");

      toast.success("Boarder added", {
        description: `Login: ${normalizePhone(vals.phone)} / ${vals.password}`,
      });
      qc.invalidateQueries({ queryKey: ["boarders", messId] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Boarder</DialogTitle>
          <DialogDescription>
            Creates a login account so the boarder can sign in with their mobile number.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="full_name" label="Full Name *" reg={register("full_name")} err={errors.full_name?.message} />
            <Field id="phone" label="Mobile *" placeholder="017XXXXXXXX" reg={register("phone")} err={errors.phone?.message} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="password" type="password" label="Initial Password *" reg={register("password")} err={errors.password?.message} />
            <Field id="seat_number" label="Seat Number" reg={register("seat_number")} err={errors.seat_number?.message} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="guardian_name" label="Guardian Name" reg={register("guardian_name")} err={errors.guardian_name?.message} />
            <Field id="guardian_phone" label="Guardian Phone" reg={register("guardian_phone")} err={errors.guardian_phone?.message} />
          </div>
          <Field id="monthly_deposit" type="number" label="Monthly Deposit (৳)" reg={register("monthly_deposit")} err={errors.monthly_deposit?.message} />
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Boarder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, type = "text", placeholder, reg, err }: any) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} {...reg} />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
