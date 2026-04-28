import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, restaurant: null, checking: true });

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("rx_token");
    if (!token) {
      setState({ user: null, restaurant: null, checking: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setState({ user: data.user, restaurant: data.restaurant, checking: false });
    } catch (e) {
      localStorage.removeItem("rx_token");
      setState({ user: null, restaurant: null, checking: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("rx_token", data.token);
    await refresh();
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("rx_token", data.token);
    await refresh();
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("rx_token");
    setState({ user: null, restaurant: null, checking: false });
  };

  return (
    <AuthCtx.Provider value={{ ...state, login, register, logout, refresh, setState }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
