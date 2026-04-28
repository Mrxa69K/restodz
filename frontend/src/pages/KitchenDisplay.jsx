import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Maximize, Minimize, Volume2, VolumeX, Sun, Moon, LogOut, Clock, Flame } from "lucide-react";
import api, { LOCALE_NAME } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ---------- audio (Web Audio API, no external file) ----------
function useBeeper() {
  const ctxRef = useRef(null);
  const ensure = () => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {}
    }
    return ctxRef.current;
  };
  const beep = (freq = 880, duration = 180, vol = 0.25) => {
    const ctx = ensure();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000 + 0.02);
    } catch (_) {}
  };
  const dingDing = () => {
    beep(880, 180);
    setTimeout(() => beep(1320, 220), 180);
  };
  return { beep, dingDing, unlock: ensure };
}

// ---------- time helpers ----------
function minutesSince(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function urgencyTone(minutes, status) {
  if (status === "ready") return { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600", ring: "" };
  if (minutes >= 15) return { bg: "bg-red-500", text: "text-white", border: "border-red-600", ring: "ring-4 ring-red-400/50" };
  if (minutes >= 8) return { bg: "bg-amber-400", text: "text-zinc-950", border: "border-amber-500", ring: "" };
  return { bg: "bg-zinc-100", text: "text-zinc-950", border: "border-zinc-300", ring: "" };
}

// ---------- order card ----------
function BigCard({ order, onAction, dark }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(i);
  }, []);
  const minutes = minutesSince(order.created_at);
  const tone = urgencyTone(minutes, order.status);

  return (
    <div
      className={`rounded-2xl border-4 ${tone.border} ${tone.ring} flex flex-col overflow-hidden ${dark ? "bg-zinc-900 text-white" : "bg-white"}`}
      data-testid={`big-order-${order.id}`}
    >
      <div className={`${tone.bg} ${tone.text} px-4 py-3 flex items-center justify-between`}>
        <div className="font-display font-black text-3xl tracking-tight">{order.number}</div>
        <div className="inline-flex items-center gap-2 text-2xl font-black">
          {minutes >= 15 ? <Flame className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          {minutes} min
        </div>
      </div>
      <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-200/20">
        <div className="text-lg font-bold uppercase tracking-wide">
          {order.table_label || "À emporter"}
        </div>
        <div className="text-sm uppercase opacity-60 tracking-wider">
          {order.type === "takeaway" ? "Emporter" : "Sur place"}
        </div>
      </div>
      <div className="px-5 py-4 space-y-2 flex-1">
        {order.items_detail.map((it, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className={`text-3xl font-black ${dark ? "text-harissa" : "text-harissa"} leading-none`}>{it.quantity}×</span>
            <span className="text-xl leading-snug">{LOCALE_NAME(it.name, "fr")}</span>
          </div>
        ))}
      </div>
      {order.note && (
        <div className={`px-5 py-2 text-sm italic ${dark ? "bg-zinc-800 text-amber-300" : "bg-amber-50 text-amber-800"}`}>
          "{order.note}"
        </div>
      )}
      <div className="p-3">
        {order.status === "pending" && (
          <button
            onClick={() => onAction(order, "preparing")}
            className="w-full h-16 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl text-2xl font-black uppercase tracking-wider transition-colors"
            data-testid={`big-start-${order.id}`}
          >
            Commencer
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => onAction(order, "ready")}
            className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-2xl font-black uppercase tracking-wider transition-colors"
            data-testid={`big-ready-${order.id}`}
          >
            Prêt ✓
          </button>
        )}
        {order.status === "ready" && (
          <button
            onClick={() => onAction(order, "served")}
            className="w-full h-16 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white rounded-xl text-2xl font-black uppercase tracking-wider transition-colors"
            data-testid={`big-served-${order.id}`}
          >
            Servi
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- column ----------
function Column({ title, accent, orders, onAction, dark }) {
  return (
    <div className="flex flex-col min-h-0">
      <div className={`${accent} rounded-t-2xl px-5 py-3 flex items-center justify-between`}>
        <div className="font-display font-black text-2xl tracking-tight text-white uppercase">{title}</div>
        <div className="text-white font-black text-3xl tabular-nums">{orders.length}</div>
      </div>
      <div className={`flex-1 p-3 overflow-y-auto scroll-soft rounded-b-2xl ${dark ? "bg-zinc-950" : "bg-zinc-100"}`}>
        {orders.length === 0 ? (
          <div className={`h-full min-h-[200px] flex items-center justify-center text-center ${dark ? "text-zinc-500" : "text-zinc-400"} text-xl font-semibold`}>
            —
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <BigCard key={o.id} order={o} onAction={onAction} dark={dark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- main page ----------
export default function KitchenDisplay() {
  const { restaurant, logout } = useAuth();
  const beeper = useBeeper();
  const [orders, setOrders] = useState([]);
  const [dark, setDark] = useState(() => localStorage.getItem("rx_kd_dark") === "1");
  const [sound, setSound] = useState(() => localStorage.getItem("rx_kd_sound") !== "0");
  const [fs, setFs] = useState(false);
  const [now, setNow] = useState(Date.now());
  const knownIds = useRef(new Set());
  const firstLoad = useRef(true);

  useEffect(() => { localStorage.setItem("rx_kd_dark", dark ? "1" : "0"); }, [dark]);
  useEffect(() => { localStorage.setItem("rx_kd_sound", sound ? "1" : "0"); }, [sound]);

  const load = async () => {
    try {
      const { data } = await api.get("/orders", { params: { limit: 100 } });
      const active = data.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
      // detect new pending orders
      const currentIds = new Set(active.map((o) => o.id));
      if (!firstLoad.current && sound) {
        const fresh = active.filter((o) => o.status === "pending" && !knownIds.current.has(o.id));
        if (fresh.length > 0) beeper.dingDing();
      }
      knownIds.current = currentIds;
      firstLoad.current = false;
      setOrders(active);
    } catch (_) {}
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const handler = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const action = async (order, status) => {
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      if (status === "ready") beeper.beep(660, 120);
      load();
    } catch (_) {}
  };

  const toggleFs = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const cols = useMemo(() => ({
    pending: orders.filter((o) => o.status === "pending"),
    preparing: orders.filter((o) => o.status === "preparing"),
    ready: orders.filter((o) => o.status === "ready"),
  }), [orders]);

  const overdue = orders.filter((o) => o.status !== "ready" && minutesSince(o.created_at) >= 15).length;

  const clock = new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const rootCls = dark ? "bg-zinc-950 text-white" : "bg-white text-rx-ink";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${rootCls}`} data-testid="kitchen-display">
      {/* Top bar */}
      <header className={`flex items-center justify-between px-6 py-3 border-b ${dark ? "border-zinc-800" : "border-zinc-200"}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-harissa flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-black text-xl tracking-tight">{restaurant?.name} · Cuisine</div>
            <div className={`text-xs uppercase tracking-[0.2em] ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
              Mise à jour auto · {orders.length} commandes · {overdue > 0 && <span className="text-red-500 font-bold">{overdue} en retard</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="kpi-number text-4xl tabular-nums">{clock}</div>
          <div className="flex gap-1">
            <button onClick={() => setSound((s) => !s)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${dark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`} title="Son" data-testid="kd-sound">
              {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
            </button>
            <button onClick={() => setDark((d) => !d)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${dark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`} title="Thème" data-testid="kd-theme">
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={toggleFs} className={`w-10 h-10 rounded-lg flex items-center justify-center ${dark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`} title="Plein écran" data-testid="kd-fs">
              {fs ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <Link to="/app/kitchen" className={`w-10 h-10 rounded-lg flex items-center justify-center ${dark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`} title="Quitter" data-testid="kd-exit">
              <LogOut className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Columns */}
      <div className={`flex-1 p-4 grid grid-cols-3 gap-4 min-h-0 ${dark ? "bg-zinc-950" : "bg-zinc-50"}`}>
        <Column title="En attente" accent="bg-amber-500" orders={cols.pending} onAction={action} dark={dark} />
        <Column title="En cours" accent="bg-blue-500" orders={cols.preparing} onAction={action} dark={dark} />
        <Column title="Prêt" accent="bg-emerald-500" orders={cols.ready} onAction={action} dark={dark} />
      </div>

      {/* Bottom strip with legend */}
      <footer className={`px-6 py-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] ${dark ? "bg-zinc-900 text-zinc-400" : "bg-zinc-100 text-zinc-500"}`}>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-zinc-300" /> 0-8 min</span>
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400" /> 8-15 min</span>
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> +15 min</span>
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Prêt</span>
        </div>
        <div>Appuyez sur un écran tactile · auto-refresh 5s</div>
      </footer>

      {/* unlock audio on first tap */}
      <div onClick={beeper.unlock} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
