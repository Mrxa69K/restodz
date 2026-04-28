import { useEffect, useMemo, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import api, { formatDZD, LOCALE_NAME } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";

function useElapsed(iso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  return minutes;
}

function OrderCard({ order, onAction, lang, t }) {
  const minutes = useElapsed(order.created_at);
  const urgent = minutes >= 15 && order.status !== "ready";
  return (
    <div className={`card-rx p-4 flex flex-col ${urgent ? "border-red-300" : ""}`} data-testid={`kitchen-order-${order.id}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display font-bold text-lg">{order.number}</div>
          <div className="text-xs text-rx-ink-3">{order.table_label || t("takeaway")}</div>
        </div>
        <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${urgent ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-700"}`}>
          {urgent ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {minutes} min
        </div>
      </div>
      <div className="mt-3 space-y-1.5 flex-1">
        {order.items_detail.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className="font-bold text-harissa">{it.quantity}×</span>
            <span className="flex-1">{LOCALE_NAME(it.name, lang)}</span>
          </div>
        ))}
      </div>
      {order.note && (
        <div className="mt-2 text-xs italic text-rx-ink-2 bg-rx-muted rounded p-2">
          "{order.note}"
        </div>
      )}
      <div className="mt-3 text-xs text-rx-ink-3 font-semibold">{formatDZD(order.total)}</div>
      <div className="mt-3 flex gap-2">
        {order.status === "pending" && (
          <button onClick={() => onAction(order, "preparing")} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-11 font-bold uppercase tracking-wider text-sm" data-testid={`btn-start-${order.id}`}>
            {t("start")}
          </button>
        )}
        {order.status === "preparing" && (
          <button onClick={() => onAction(order, "ready")} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-11 font-bold uppercase tracking-wider text-sm" data-testid={`btn-ready-${order.id}`}>
            {t("mark_ready")}
          </button>
        )}
        {order.status === "ready" && (
          <button onClick={() => onAction(order, "served")} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg h-11 font-bold uppercase tracking-wider text-sm" data-testid={`btn-served-${order.id}`}>
            {t("mark_served")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Kitchen() {
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("all");

  const load = async () => {
    const { data } = await api.get("/orders", { params: { limit: 100 } });
    setOrders(data.filter((o) => ["pending", "preparing", "ready"].includes(o.status)));
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  const action = async (order, status) => {
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      toast.success(`${order.number} → ${t(status)}`);
      load();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto" data-testid="kitchen-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tight">{t("kitchen")}</h1>
          <p className="text-rx-ink-2 mt-1">Commandes en cuisine · temps réel</p>
        </div>
        <div className="text-xs text-rx-ink-2 bg-rx-muted px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block me-2 pulse-dot" />
          Auto-refresh 10s
        </div>
      </div>

      <div className="flex gap-1 bg-rx-muted p-1 rounded-lg w-fit mb-5" data-testid="kitchen-tabs">
        {[
          ["all", t("all")],
          ["pending", t("pending")],
          ["preparing", t("preparing")],
          ["ready", t("ready")],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === k ? "bg-white text-rx-ink shadow-sm" : "text-rx-ink-2 hover:text-rx-ink"
            }`}
            data-testid={`tab-${k}`}
          >
            {label} <span className="text-xs opacity-70 ms-1">({counts[k]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-rx p-16 text-center text-rx-ink-3">Pas de commandes. Souffle 🫁</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onAction={action} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
