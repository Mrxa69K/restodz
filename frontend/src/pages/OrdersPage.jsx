import { useEffect, useState } from "react";
import api, { formatDZD, LOCALE_NAME } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { StatusBadge } from "./Dashboard";

export default function OrdersPage() {
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const { data } = await api.get("/orders", { params: { limit: 500 } });
    setOrders(data);
  };
  useEffect(() => { load(); }, []);

  const visible = filter ? orders.filter((o) => o.status === filter) : orders;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto" data-testid="orders-page">
      <h1 className="font-display font-black text-3xl tracking-tight mb-1">{t("orders")}</h1>
      <p className="text-rx-ink-2 mb-5">Historique complet des commandes.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[["", "Toutes"], ["pending", t("pending")], ["preparing", t("preparing")], ["ready", t("ready")], ["served", t("served")], ["cancelled", "Annulées"]].map(([k, label]) => (
          <button key={k || "all"} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === k ? "bg-rx-ink text-white" : "bg-white border border-rx text-rx-ink-2"}`} data-testid={`filter-${k || "all"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card-rx overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-rx-muted">
              <tr className="text-left text-xs uppercase tracking-wider text-rx-ink-3">
                <th className="p-3">#</th>
                <th className="p-3">Type</th>
                <th className="p-3">Table</th>
                <th className="p-3">Articles</th>
                <th className="p-3">Total</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Heure</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-rx-ink-3">{t("empty")}</td></tr>
              )}
              {visible.map((o) => (
                <tr key={o.id} className="border-t border-rx" data-testid={`order-row-${o.id}`}>
                  <td className="p-3 font-semibold">{o.number}</td>
                  <td className="p-3 text-rx-ink-2">{o.type === "takeaway" ? t("takeaway") : t("dine_in")}</td>
                  <td className="p-3 text-rx-ink-2">{o.table_label || "—"}</td>
                  <td className="p-3 text-rx-ink-2 max-w-xs truncate">{o.items_detail.map((it) => `${it.quantity}× ${LOCALE_NAME(it.name, lang)}`).join(", ")}</td>
                  <td className="p-3 font-semibold">{formatDZD(o.total)}</td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                  <td className="p-3 text-rx-ink-3 text-xs">{new Date(o.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
