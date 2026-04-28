import { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle, Download } from "lucide-react";
import api, { formatDZD, API } from "@/lib/api";
import { toast } from "sonner";

function downloadCsv(path, filename) {
  const token = localStorage.getItem("rx_token");
  fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
}

export default function StockPage() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ name: "", unit: "kg", quantity: 0, low_threshold: 0, cost: 0 });

  const load = async () => setItems((await api.get("/stock")).data);
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!f.name.trim()) return toast.error("Nom requis");
    await api.post("/stock", f);
    setF({ name: "", unit: "kg", quantity: 0, low_threshold: 0, cost: 0 });
    toast.success("Ajouté"); load();
  };
  const del = async (id) => { await api.delete(`/stock/${id}`); load(); };
  const patch = async (row, updates) => { await api.patch(`/stock/${row.id}`, { ...row, ...updates }); load(); };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto" data-testid="stock-page">
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tight">Stock & Achats</h1>
          <p className="text-rx-ink-2">Ingrédients, seuils et coûts.</p>
        </div>
        <button onClick={() => downloadCsv("/export/stock.csv", "stock.csv")} className="btn-ghost inline-flex items-center gap-2" data-testid="export-stock-csv">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      <div className="card-rx p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input placeholder="Ingrédient" className="px-3 py-2 rounded-lg border border-rx col-span-2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="stock-name" />
          <input placeholder="Unité" className="px-3 py-2 rounded-lg border border-rx" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
          <input type="number" placeholder="Quantité" className="px-3 py-2 rounded-lg border border-rx" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} />
          <input type="number" placeholder="Seuil bas" className="px-3 py-2 rounded-lg border border-rx" value={f.low_threshold} onChange={(e) => setF({ ...f, low_threshold: Number(e.target.value) })} />
          <input type="number" placeholder="Coût (DZD)" className="px-3 py-2 rounded-lg border border-rx" value={f.cost} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} />
        </div>
        <button className="btn-harissa mt-3 inline-flex items-center gap-2" onClick={add} data-testid="stock-add"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>

      <div className="card-rx overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-rx-muted">
              <tr className="text-left text-xs uppercase tracking-wider text-rx-ink-3">
                <th className="p-3">Ingrédient</th>
                <th className="p-3">Unité</th>
                <th className="p-3">Quantité</th>
                <th className="p-3">Seuil bas</th>
                <th className="p-3">Coût/unité</th>
                <th className="p-3">Valeur</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const low = i.quantity <= i.low_threshold;
                return (
                  <tr key={i.id} className="border-t border-rx" data-testid={`stock-row-${i.id}`}>
                    <td className="p-3 font-medium">{i.name} {low && <AlertTriangle className="w-4 h-4 inline text-amber-500 ms-1" />}</td>
                    <td className="p-3 text-rx-ink-2">{i.unit}</td>
                    <td className="p-3">
                      <input type="number" value={i.quantity} onChange={(e) => patch(i, { quantity: Number(e.target.value) })} className={`w-24 px-2 py-1 rounded border border-rx ${low ? "text-amber-700 font-bold" : ""}`} />
                    </td>
                    <td className="p-3 text-rx-ink-2">{i.low_threshold}</td>
                    <td className="p-3 text-rx-ink-2">{formatDZD(i.cost)}</td>
                    <td className="p-3 font-semibold">{formatDZD(i.cost * i.quantity)}</td>
                    <td className="p-3"><button onClick={() => del(i.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-rx-ink-3">Aucun ingrédient</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
