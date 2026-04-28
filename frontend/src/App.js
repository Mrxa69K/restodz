import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { Toaster } from "sonner";

import Landing from "@/pages/Landing";
import Strategy from "@/pages/Strategy";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Kitchen from "@/pages/Kitchen";
import OrdersPage from "@/pages/OrdersPage";
import MenuMaker from "@/pages/MenuMaker";
import TablesQR from "@/pages/TablesQR";
import AnalyticsPage from "@/pages/AnalyticsPage";
import StockPage from "@/pages/StockPage";
import SettingsPage from "@/pages/SettingsPage";
import StaffPage from "@/pages/StaffPage";
import FeedbackPage from "@/pages/FeedbackPage";
import CustomerMenu from "@/pages/CustomerMenu";

function Protected({ children }) {
  const auth = useAuth();
  if (auth.checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rx-ink-2">
        Chargement…
      </div>
    );
  }
  if (!auth.user) return <Navigate to="/login" replace />;
  return children;
}

const ROLE_HOME = {
  owner: "/app/dashboard",
  manager: "/app/dashboard",
  kitchen: "/app/kitchen",
  waiter: "/app/orders",
};

function RoleHome() {
  const auth = useAuth();
  return <Navigate to={ROLE_HOME[auth.user?.role] || "/app/dashboard"} replace />;
}

function RoleGuard({ allow, children }) {
  const auth = useAuth();
  const role = auth.user?.role;
  if (!allow.includes(role)) return <RoleHome />;
  return children;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/strategy" element={<Strategy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/m/:slug" element={<CustomerMenu />} />

            <Route path="/app" element={<Protected><AppLayout /></Protected>}>
              <Route index element={<RoleHome />} />
              <Route path="dashboard" element={<RoleGuard allow={["owner", "manager"]}><Dashboard /></RoleGuard>} />
              <Route path="kitchen" element={<Kitchen />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="menu" element={<RoleGuard allow={["owner", "manager"]}><MenuMaker /></RoleGuard>} />
              <Route path="tables" element={<RoleGuard allow={["owner", "manager", "waiter"]}><TablesQR /></RoleGuard>} />
              <Route path="analytics" element={<RoleGuard allow={["owner", "manager"]}><AnalyticsPage /></RoleGuard>} />
              <Route path="stock" element={<RoleGuard allow={["owner", "manager"]}><StockPage /></RoleGuard>} />
              <Route path="feedback" element={<RoleGuard allow={["owner", "manager"]}><FeedbackPage /></RoleGuard>} />
              <Route path="staff" element={<RoleGuard allow={["owner", "manager"]}><StaffPage /></RoleGuard>} />
              <Route path="settings" element={<RoleGuard allow={["owner", "manager"]}><SettingsPage /></RoleGuard>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
