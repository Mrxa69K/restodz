import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { ArrowUp, ArrowDown, Users, ReceiptText, CircleDollarSign, UtensilsCrossed } from "lucide-react";
import api, { formatDZD, LOCALE_NAME } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";

const Kpi = ({ label, value, sub, tone = "harissa", icon: Icon, testid }) => (
  <div className="card-rx p-5" data-testid={testid}>
    <div className="flex items-center justify-between">
      <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-rx-ink-3">{label}</div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-harissa-soft text-harissa`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="kpi-number text-4xl mt-3">{value}</div>
    {sub && <div className="text-xs mt-2 text-rx-ink-2">{sub}</div>}
  </div>
);

const trendSub = (today, yesterday) => {
  if (!yesterday) return null;
  const diff = today - yesterday;
  const pct = yesterday ? Math.round((diff / yesterday) * 100) : 0;
  const up = diff >= 0;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(pct)}% vs hier
    </span>
  );
};

export default function Dashboard() {
  const { t, lang } = useI18n();
  const [d, setD] = useState(null);

  const load = async () => {
    const { data } = await api.get("/analytics/dashboard");
    setD(data);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  if (!d) return <div className="p-10 text-rx-ink-2">{t("loading")}</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto" data-testid="dashboard-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tight">{t("dashboard")}</h1>
          <p className="text-rx-ink-2 mt-1">Aujourd'hui · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-rx-ink-2 bg-rx-muted px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
          Temps réel · auto-refresh 15s
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi testid="kpi-revenue" label={t("revenue")} value={formatDZD(d.revenue_today)} sub={trendSub(d.revenue_today, d.revenue_yesterday)} icon={CircleDollarSign} />
        <Kpi testid="kpi-orders" label={t("orders_today")} value={d.orders_today} sub={trendSub(d.orders_today, d.orders_yesterday)} icon={ReceiptText} />
        <Kpi testid="kpi-avg" label={t("avg_ticket")} value={formatDZD(d.avg_ticket_today)} sub={trendSub(d.avg_ticket_today, d.avg_ticket_yesterday)} icon={UtensilsCrossed} />
        <Kpi testid="kpi-tables" label={t("active_tables")} value={`${d.active_tables}/${d.total_tables}`} sub={`${Math.max(0, d.total_tables - d.active_tables)} disponibles`} icon={Users} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="card-rx p-5 lg:col-span-2" data-testid="chart-hourly">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg">{t("hourly_revenue")}</h3>
              <p className="text-xs text-rx-ink-3">Par heure · aujourd'hui</p>
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={d.hourly_revenue}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717A" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => v > 999 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v) => formatDZD(v)} cursor={{ fill: "#FFEDD5" }} />
                <Bar dataKey="revenue" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-rx p-5" data-testid="best-sellers">
          <h3 className="font-display font-bold text-lg">{t("best_sellers")}</h3>
          <p className="text-xs text-rx-ink-3">Top 5 aujourd'hui</p>
          <div className="mt-4 space-y-3">
            {d.best_sellers.length === 0 && <div className="text-sm text-rx-ink-3">{t("empty")}</div>}
            {d.best_sellers.map((b, i) => (
              <div key={b.item_id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-harissa-soft text-harissa text-xs font-bold flex items-center justify-center">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{LOCALE_NAME(b.name, lang)}</div>
                  <div className="text-xs text-rx-ink-3">{formatDZD(b.price)}</div>
                </div>
                <div className="kpi-number text-lg">{b.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-rx p-5 mt-4" data-testid="active-orders">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-lg">{t("active_orders")}</h3>
            <p className="text-xs text-rx-ink-3">En temps réel</p>
          </div>
          <div className="text-xs text-rx-ink-2 bg-rx-muted px-2 py-1 rounded">{d.active_orders.length} commandes</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-rx-ink-3 border-b border-rx">
                <th className="py-2 pe-4">#</th>
                <th className="py-2 pe-4">Table</th>
                <th className="py-2 pe-4">Articles</th>
                <th className="py-2 pe-4">Total</th>
                <th className="py-2 pe-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {d.active_orders.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-rx-ink-3">{t("empty")}</td></tr>
              )}
              {d.active_orders.map((o) => (
                <tr key={o.id} className="border-b border-rx last:border-0">
                  <td className="py-3 pe-4 font-semibold">{o.number}</td>
                  <td className="py-3 pe-4 text-rx-ink-2">{o.table_label || t("takeaway")}</td>
                  <td className="py-3 pe-4 text-rx-ink-2 max-w-xs truncate">
                    {o.items_detail.map((it) => `${it.quantity}× ${LOCALE_NAME(it.name, lang)}`).join(", ")}
                  </td>
                  <td className="py-3 pe-4 font-semibold">{formatDZD(o.total)}</td>
                  <td className="py-3 pe-4">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending: ["bg-amber-50 text-amber-700 border-amber-200", "En attente"],
    preparing: ["bg-blue-50 text-blue-700 border-blue-200", "En cours"],
    ready: ["bg-emerald-50 text-emerald-700 border-emerald-200", "Prêt"],
    served: ["bg-zinc-100 text-zinc-700 border-zinc-200", "Servi"],
    cancelled: ["bg-red-50 text-red-700 border-red-200", "Annulé"],
  };
  const [cls, label] = map[status] || map.pending;
  return <span className={`text-xs font-semibold px-2 py-1 rounded border ${cls}`}>{label}</span>;
}
