import { useEffect, useState } from "react";
import { Plus, Trash2, Printer, Download } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function TablesQR() {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState([]);
  const [qrs, setQrs] = useState({}); // id -> { png, url }
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState(4);

  const load = async () => {
    const { data } = await api.get("/tables");
    setTables(data);
    const ents = await Promise.all(data.map((t) => api.get(`/tables/${t.id}/qr`).then((r) => [t.id, r.data]).catch(() => [t.id, null])));
    const map = {}; ents.forEach(([id, d]) => { if (d) map[id] = d; });
    setQrs(map);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!label.trim()) return toast.error("Nom de table requis");
    await api.post("/tables", { label, seats });
    setLabel("");
    toast.success("Table ajoutée");
    load();
  };
  const del = async (id) => {
    if (!window.confirm("Supprimer cette table ?")) return;
    await api.delete(`/tables/${id}`); toast.success("Supprimée"); load();
  };

  const printAll = () => window.print();

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto" data-testid="tables-qr-page">
      <div className="flex items-end justify-between mb-6 print:hidden">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tight">Tables & QR Codes</h1>
          <p className="text-rx-ink-2 mt-1">Génère un QR par table · imprimez et collez.</p>
        </div>
        <button onClick={printAll} className="btn-ghost inline-flex items-center gap-2" data-testid="print-qr">
          <Printer className="w-4 h-4" /> Imprimer tout
        </button>
      </div>

      <div className="card-rx p-4 mb-5 print:hidden">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-40">
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Label</label>
            <input className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Table 09" data-testid="table-label" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Places</label>
            <input type="number" className="mt-1 w-24 px-3 py-2 rounded-lg border border-rx" value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
          </div>
          <button onClick={add} className="btn-harissa inline-flex items-center gap-2" data-testid="add-table"><Plus className="w-4 h-4" /> Ajouter</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((t) => {
          const q = qrs[t.id];
          return (
            <div key={t.id} className="card-rx p-4 text-center print:border-2 print:shadow-none" data-testid={`table-${t.id}`}>
              <div className="font-display font-black text-2xl text-rx-ink">{t.label}</div>
              <div className="text-xs text-rx-ink-3">{restaurant?.name}</div>
              <div className="mt-3 aspect-square bg-white rounded-lg border border-rx flex items-center justify-center p-3">
                {q ? (
                  <img src={`data:image/png;base64,${q.qr_png_base64}`} alt={t.label} className="w-full h-full" />
                ) : (
                  <div className="text-rx-ink-3 text-xs">Chargement…</div>
                )}
              </div>
              <div className="mt-3 text-xs text-rx-ink-2 font-semibold">
                Scannez → Menu → Commandez
              </div>
              <div className="text-[10px] text-rx-ink-3 mt-1 font-arabic">امسح لرؤية القائمة</div>
              <button onClick={() => del(t.id)} className="mt-3 text-red-500 text-xs inline-flex items-center gap-1 print:hidden" data-testid={`del-table-${t.id}`}>
                <Trash2 className="w-3 h-3" /> Supprimer
              </button>
            </div>
          );
        })}
        {tables.length === 0 && <div className="col-span-full card-rx p-12 text-center text-rx-ink-3">Aucune table. Ajoutez la première ci-dessus.</div>}
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
