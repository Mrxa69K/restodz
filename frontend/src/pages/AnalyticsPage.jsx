import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import api, { formatDZD } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [d, setD] = useState(null);

  useEffect(() => { api.get("/analytics/trends", { params: { days: 7 } }).then(({ data }) => setD(data)); }, []);
  if (!d) return <div className="p-10 text-rx-ink-2">{t("loading")}</div>;

  const totalRev = d.daily.reduce((a, b) => a + b.revenue, 0);
  const totalOrders = d.daily.reduce((a, b) => a + b.orders, 0);
  const avg = totalOrders ? totalRev / totalOrders : 0;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto" data-testid="analytics-page">
      <h1 className="font-display font-black text-3xl tracking-tight mb-1">{t("analytics")}</h1>
      <p className="text-rx-ink-2 mb-6">Tendances 7 derniers jours</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="card-rx p-5">
          <div className="text-xs uppercase tracking-widest text-rx-ink-3 font-semibold">CA 7 jours</div>
          <div className="kpi-number text-4xl mt-2">{formatDZD(totalRev)}</div>
        </div>
        <div className="card-rx p-5">
          <div className="text-xs uppercase tracking-widest text-rx-ink-3 font-semibold">Commandes</div>
          <div className="kpi-number text-4xl mt-2">{totalOrders}</div>
        </div>
        <div className="card-rx p-5">
          <div className="text-xs uppercase tracking-widest text-rx-ink-3 font-semibold">Ticket moyen</div>
          <div className="kpi-number text-4xl mt-2">{formatDZD(avg)}</div>
        </div>
      </div>

      <div className="card-rx p-5 mb-4">
        <h3 className="font-display font-bold text-lg">Revenus par jour</h3>
        <div className="h-72 mt-3">
          <ResponsiveContainer>
            <LineChart data={d.daily}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717A" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => v > 999 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => formatDZD(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} dot={{ r: 4, fill: "#F97316" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-rx p-5">
        <h3 className="font-display font-bold text-lg">Heures de pointe</h3>
        <p className="text-xs text-rx-ink-3">Revenu par heure cumulé sur 7 jours</p>
        <div className="h-72 mt-3">
          <ResponsiveContainer>
            <BarChart data={d.peak_hours.filter((h) => h.revenue > 0)}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717A" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => v > 999 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => formatDZD(v)} />
              <Bar dataKey="revenue" fill="#F97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
