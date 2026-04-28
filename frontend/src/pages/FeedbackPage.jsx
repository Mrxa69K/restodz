import { useEffect, useMemo, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import api from "@/lib/api";

function Stars({ n }) {
  return (
    <div className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= n ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/feedback").then(({ data }) => setRows(data)); }, []);

  const avg = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((a, b) => a + b.rating, 0) / rows.length;
  }, [rows]);

  const distribution = [1, 2, 3, 4, 5].map((n) => ({
    n,
    count: rows.filter((r) => r.rating === n).length,
  }));

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto" data-testid="feedback-page">
      <h1 className="font-display font-black text-3xl tracking-tight mb-1">Avis clients</h1>
      <p className="text-rx-ink-2 mb-6">Retours laissés après les commandes.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <div className="card-rx p-5 md:col-span-1">
          <div className="text-xs uppercase tracking-widest text-rx-ink-3 font-semibold">Note moyenne</div>
          <div className="kpi-number text-5xl mt-2">{avg.toFixed(1)}</div>
          <div className="mt-1"><Stars n={Math.round(avg)} /></div>
          <div className="text-xs text-rx-ink-3 mt-1">{rows.length} avis au total</div>
        </div>
        <div className="card-rx p-5 md:col-span-2">
          <div className="text-xs uppercase tracking-widest text-rx-ink-3 font-semibold mb-3">Répartition</div>
          <div className="space-y-2">
            {[...distribution].reverse().map((d) => {
              const pct = rows.length ? Math.round((d.count / rows.length) * 100) : 0;
              return (
                <div key={d.n} className="flex items-center gap-3">
                  <div className="w-8 text-sm font-semibold">{d.n}★</div>
                  <div className="flex-1 h-2 bg-rx-muted rounded-full overflow-hidden">
                    <div className="h-full bg-harissa" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-12 text-sm text-rx-ink-2 text-end">{d.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="card-rx p-12 text-center text-rx-ink-3 flex flex-col items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Aucun avis pour l'instant.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="card-rx p-4" data-testid={`feedback-row-${r.id}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-harissa-soft text-harissa font-bold flex items-center justify-center">
                {(r.customer_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold truncate">{r.customer_name || "Anonyme"}</div>
                  <Stars n={r.rating} />
                </div>
                <div className="text-xs text-rx-ink-3">{new Date(r.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
            {r.comment && <p className="mt-3 text-rx-ink-2 text-sm leading-relaxed">"{r.comment}"</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
