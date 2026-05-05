"use client";

import AppLayout from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function MessAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allow={["mess_admin", "super_admin"]}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
