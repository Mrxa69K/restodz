import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      setJustBack(true);
      setTimeout(() => setJustBack(false), 2500);
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online && !justBack) return null;
  return (
    <div
      className={`sticky top-0 z-40 text-center text-xs font-semibold py-2 px-4 ${
        online ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
      }`}
      data-testid="offline-indicator"
    >
      {online ? (
        <span className="inline-flex items-center gap-2"><Wifi className="w-3.5 h-3.5" /> De retour en ligne · synchronisation…</span>
      ) : (
        <span className="inline-flex items-center gap-2"><WifiOff className="w-3.5 h-3.5" /> Mode hors-ligne · les données en cache sont affichées</span>
      )}
    </div>
  );
}
