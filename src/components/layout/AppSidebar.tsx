import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, UtensilsCrossed, Wallet, Receipt, Package, Megaphone, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/boarders", label: "Boarders", icon: Users },
  { to: "/app/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/app/expenses", label: "Expenses", icon: Receipt },
  { to: "/app/deposits", label: "Deposits", icon: Wallet },
  { to: "/app/stock", label: "Stock", icon: Package },
  { to: "/app/notices", label: "Notices", icon: Megaphone },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const mobileItems = items.slice(0, 5); // 5 max for bottom nav

export function AppSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground">
      <div className="h-16 flex items-center px-5 border-b">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center mr-2 shadow-md">
          <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">Meal<span className="text-gradient">Khata</span></span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <it.icon className="w-4 h-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t">
      <div className="grid grid-cols-5 h-16">
        {mobileItems.map((it) => {
          const active = it.end ? pathname === it.to : pathname.startsWith(it.to);
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <it.icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
              {it.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
