import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rx_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const formatDZD = (amount) => {
  const n = Math.round(Number(amount || 0));
  return `${n.toLocaleString("fr-FR").replace(/\u202f/g, " ").replace(/,/g, " ")} DA`;
};

export const formatApiError = (err) => {
  const d = err?.response?.data?.detail;
  if (!d) return err?.message || "Une erreur s'est produite";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (typeof d === "object" && d.msg) return d.msg;
  return String(d);
};

export const LOCALE_NAME = (obj, lang = "fr") => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.fr || obj.en || obj.ar || "";
};
