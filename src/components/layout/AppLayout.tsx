import { Outlet } from "react-router-dom";
import { AppSidebar, MobileBottomNav } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex bg-gradient-subtle">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
