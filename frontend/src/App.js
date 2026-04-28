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
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="kitchen" element={<Kitchen />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="menu" element={<MenuMaker />} />
              <Route path="tables" element={<TablesQR />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
