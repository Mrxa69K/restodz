import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ChefHat, ReceiptText, BookOpen, QrCode,
  LineChart, Boxes, Settings, LogOut, Globe, Store, Users, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import OfflineIndicator from "@/components/OfflineIndicator";

const nav = [
  { to: "/app/dashboard", i: LayoutDashboard, k: "dashboard", roles: ["owner", "manager"] },
  { to: "/app/kitchen", i: ChefHat, k: "kitchen", roles: ["owner", "manager", "kitchen", "waiter"] },
  { to: "/app/orders", i: ReceiptText, k: "orders", roles: ["owner", "manager", "kitchen", "waiter"] },
  { to: "/app/menu", i: BookOpen, k: "menu", roles: ["owner", "manager"] },
  { to: "/app/tables", i: QrCode, k: "tables", roles: ["owner", "manager", "waiter"] },
  { to: "/app/analytics", i: LineChart, k: "analytics", roles: ["owner", "manager"] },
  { to: "/app/stock", i: Boxes, k: "stock", roles: ["owner", "manager"] },
  { to: "/app/feedback", i: MessageSquare, k: "feedback", roles: ["owner", "manager"] },
  { to: "/app/staff", i: Users, k: "staff", roles: ["owner", "manager"] },
  { to: "/app/settings", i: Settings, k: "settings", roles: ["owner", "manager"] },
];

export default function AppLayout() {
  const { restaurant, user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  const role = user?.role || "owner";
  const visibleNav = nav.filter((n) => n.roles.includes(role));
  const roleLabel = { owner: "Propriétaire", manager: "Manager", kitchen: "Cuisine", waiter: "Serveur" }[role] || role;

  return (
    <div className="min-h-screen bg-rx-paper" data-testid="app-layout">
      <aside
        className="fixed top-0 start-0 h-screen w-64 bg-white border-e border-rx hidden lg:flex flex-col"
        data-testid="app-sidebar"
      >
        <Link to="/app/dashboard" className="px-6 h-16 flex items-center gap-2 border-b border-rx" data-testid="sidebar-logo">
          <div className="w-8 h-8 rounded-lg bg-harissa flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div className="font-display font-extrabold text-lg tracking-tight">RestaurantOS</div>
        </Link>

        <div className="px-4 py-4 border-b border-rx">
          <div className="text-xs uppercase tracking-widest text-rx-ink-3 font-semibold">{t("settings")}</div>
          <div className="mt-2 font-semibold text-rx-ink truncate">{restaurant?.name}</div>
          <div className="text-xs text-rx-ink-2 mt-1 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-harissa" />
            {roleLabel}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scroll-soft">
          {visibleNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-harissa-soft text-harissa"
                    : "text-rx-ink-2 hover:bg-rx-muted hover:text-rx-ink"
                }`
              }
              data-testid={`nav-${n.k}`}
            >
              <n.i className="w-4 h-4" />
              <span>{t(n.k)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-rx">
          <button
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rx-ink-2 hover:bg-rx-muted"
            data-testid="lang-toggle"
          >
            <Globe className="w-4 h-4" />
            {lang === "fr" ? "العربية" : "Français"}
          </button>
          <button
            onClick={doLogout}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-sm text-rx-ink-2 hover:bg-rx-muted"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </button>
          <div className="mt-3 px-3 py-2 text-xs text-rx-ink-3 truncate">{user?.email}</div>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-rx h-14 flex items-center justify-between px-4">
        <Link to="/app/dashboard" className="font-display font-extrabold text-base">RestaurantOS</Link>
        <button onClick={doLogout} className="text-sm text-rx-ink-2">{t("logout")}</button>
      </header>

      <main className="lg:ms-64 min-h-screen" data-testid="app-main">
        <OfflineIndicator />
        <Outlet />
      </main>
    </div>
  );
}
