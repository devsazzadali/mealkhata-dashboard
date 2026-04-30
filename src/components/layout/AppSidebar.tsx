import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, UtensilsCrossed, Wallet, Receipt, Package,
  Megaphone, Settings, Calculator, MessageCircle, UserPlus, User,
  Zap, FileText, BarChart3, Image as ImageIcon, CalendarClock,
  MessageSquareHeart, CalendarDays, ShoppingCart,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const adminItems = [
  { to: "/app", label: "ড্যাশবোর্ড", icon: LayoutDashboard, end: true },
  { to: "/app/boarders", label: "সদস্যবৃন্দ", icon: Users },
  { to: "/app/meals", label: "আজকের মেনু", icon: UtensilsCrossed },
  { to: "/app/balance", label: "মিল ব্যবস্থাপনা", icon: Calculator },
  { to: "/app/bazar-schedule", label: "বাজার শিডিউল", icon: CalendarClock },
  { to: "/app/gallery", label: "গ্যালারি", icon: ImageIcon },
  { to: "/app/expenses", label: "বাজার ও খরচ", icon: ShoppingCart },
  { to: "/app/extra-bills", label: "এক্সট্রা বিল", icon: Zap },
  { to: "/app/deposits", label: "ডিপোজিট", icon: Wallet },
  { to: "/app/monthly-bills", label: "বিল ও পেমেন্ট", icon: Receipt },
  { to: "/app/stock", label: "স্টক", icon: Package },
  { to: "/app/notices", label: "নোটিশ বোর্ড", icon: Megaphone },
  { to: "/app/feedback", label: "ফিডব্যাক", icon: MessageSquareHeart },
  { to: "/app/reports", label: "রিপোর্ট", icon: BarChart3 },
  { to: "/app/events", label: "ইভেন্ট", icon: CalendarDays },
  { to: "/app/ads", label: "বিজ্ঞাপন দিন", icon: Megaphone },
  { to: "/app/chat", label: "গ্রুপ চ্যাট", icon: MessageCircle },
  { to: "/app/join-requests", label: "জয়েন রিকোয়েস্ট", icon: UserPlus },
  { to: "/app/profile", label: "প্রোফাইল", icon: User },
  { to: "/app/settings", label: "সেটিংস", icon: Settings },
];

const boarderItems = [
  { to: "/me", label: "ড্যাশবোর্ড", icon: LayoutDashboard, end: true },
  { to: "/me/gallery", label: "গ্যালারি", icon: ImageIcon },
  { to: "/me/events", label: "ইভেন্ট", icon: CalendarDays },
  { to: "/me/feedback", label: "ফিডব্যাক", icon: MessageSquareHeart },
  { to: "/me/ads", label: "বিজ্ঞাপন", icon: Megaphone },
  { to: "/me/chat", label: "গ্রুপ চ্যাট", icon: MessageCircle },
  { to: "/me/profile", label: "প্রোফাইল", icon: User },
];

function useNavItems() {
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes("mess_admin") || roles.includes("super_admin");
  return isAdmin ? adminItems : boarderItems;
}

export function AppSidebar() {
  const items = useNavItems();
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
  const items = useNavItems();
  // Pick 5 most useful for mobile
  const adminMobile = ["/app", "/app/meals", "/app/chat", "/app/balance", "/app/profile"];
  const boarderMobile = ["/me", "/me/chat", "/me/profile"];
  const mobileSet = new Set(items === adminItems ? adminMobile : boarderMobile);
  const mobileItems = items.filter((i) => mobileSet.has(i.to));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t">
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}>
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
