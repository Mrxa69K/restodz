import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Download, Sparkles } from "lucide-react";
import api, { formatDZD, LOCALE_NAME, API } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import OcrImportModal from "@/components/OcrImportModal";

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

function CategoryForm({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || { fr: "", ar: "", en: "" });
  const [order, setOrder] = useState(initial?.order ?? 0);
  const save = async () => {
    try {
      if (initial) await api.patch(`/categories/${initial.id}`, { name, order });
      else await api.post("/categories", { name, order });
      toast.success("Catégorie enregistrée");
      onSaved();
      onClose();
    } catch (e) { toast.error("Erreur"); }
  };
  return (
    <Modal onClose={onClose} title={initial ? "Modifier catégorie" : "Nouvelle catégorie"}>
      <div className="space-y-3">
        {["fr", "ar", "en"].map((l) => (
          <div key={l}>
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Nom ({l.toUpperCase()})</label>
            <input className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={name[l]} onChange={(e) => setName({ ...name, [l]: e.target.value })} data-testid={`cat-name-${l}`} />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Ordre d'affichage</label>
          <input type="number" className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-4 flex gap-2 justify-end">
        <button onClick={onClose} className="btn-ghost">Annuler</button>
        <button onClick={save} className="btn-harissa" data-testid="cat-save">Enregistrer</button>
      </div>
    </Modal>
  );
}

function ItemForm({ initial, categories, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || { fr: "", ar: "", en: "" });
  const [description, setDescription] = useState(initial?.description || { fr: "", ar: "", en: "" });
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [category_id, setCategory] = useState(initial?.category_id || categories[0]?.id || "");
  const [image_url, setImage] = useState(initial?.image_url || "");
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [tab, setTab] = useState("fr");

  const save = async () => {
    try {
      const body = { name, description, price: Number(price), category_id, image_url, available, order: initial?.order ?? 0 };
      if (initial) await api.patch(`/items/${initial.id}`, body);
      else await api.post("/items", body);
      toast.success("Article enregistré");
      onSaved();
      onClose();
    } catch (e) { toast.error("Erreur"); }
  };
  return (
    <Modal onClose={onClose} title={initial ? "Modifier article" : "Nouvel article"}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Catégorie</label>
          <select className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={category_id} onChange={(e) => setCategory(e.target.value)} data-testid="item-category">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name.fr}</option>)}
          </select>
        </div>
        <div className="flex gap-1 bg-rx-muted p-1 rounded-lg w-fit">
          {["fr", "ar", "en"].map((l) => (
            <button key={l} onClick={() => setTab(l)} className={`px-3 py-1 rounded-md text-xs font-semibold ${tab === l ? "bg-white shadow-sm" : ""}`} data-testid={`tab-lang-${l}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Nom ({tab.toUpperCase()})</label>
          <input className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={name[tab]} onChange={(e) => setName({ ...name, [tab]: e.target.value })} dir={tab === "ar" ? "rtl" : "ltr"} data-testid={`item-name-${tab}`} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Description ({tab.toUpperCase()})</label>
          <textarea rows={2} className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={description[tab]} onChange={(e) => setDescription({ ...description, [tab]: e.target.value })} dir={tab === "ar" ? "rtl" : "ltr"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Prix (DZD)</label>
            <input type="number" className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="item-price" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Image URL</label>
            <input className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={image_url} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> Disponible
        </label>
      </div>
      <div className="mt-4 flex gap-2 justify-end">
        <button onClick={onClose} className="btn-ghost">Annuler</button>
        <button onClick={save} className="btn-harissa" data-testid="item-save">Enregistrer</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-rx flex items-center justify-between">
          <div className="font-display font-bold text-lg">{title}</div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function MenuMaker() {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [catOpen, setCatOpen] = useState(null); // object or {} for new
  const [itemOpen, setItemOpen] = useState(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(null);

  const load = async () => {
    const [c, i] = await Promise.all([api.get("/categories"), api.get("/items")]);
    setCategories(c.data);
    setItems(i.data);
    if (!activeCat && c.data[0]) setActiveCat(c.data[0].id);
  };
  useEffect(() => { load(); }, []);

  const delCat = async (c) => {
    if (!window.confirm(`Supprimer ${c.name.fr} ?`)) return;
    await api.delete(`/categories/${c.id}`); toast.success("Supprimé"); load();
  };
  const delItem = async (i) => {
    if (!window.confirm(`Supprimer ${i.name.fr} ?`)) return;
    await api.delete(`/items/${i.id}`); toast.success("Supprimé"); load();
  };

  const visibleItems = activeCat ? items.filter((i) => i.category_id === activeCat) : items;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto" data-testid="menu-maker">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tight">Menu Maker</h1>
          <p className="text-rx-ink-2 mt-1">Catégories & plats · trilingue AR/FR/EN</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-ghost inline-flex items-center gap-2" onClick={() => downloadCsv("/export/items.csv", "menu.csv")} data-testid="export-menu-csv"><Download className="w-4 h-4" /> CSV</button>
          <button className="inline-flex items-center gap-2 bg-zinc-950 text-white rounded-lg px-4 py-2 font-semibold hover:bg-zinc-800 transition-colors" onClick={() => setOcrOpen(true)} data-testid="open-ocr">
            <Sparkles className="w-4 h-4" /> Import par photo (IA)
          </button>
          <button className="btn-ghost inline-flex items-center gap-2" onClick={() => setCatOpen({})} data-testid="add-category"><Plus className="w-4 h-4" /> Catégorie</button>
          <button className="btn-harissa inline-flex items-center gap-2" onClick={() => setItemOpen({})} data-testid="add-item"><Plus className="w-4 h-4" /> Article</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 card-rx p-4 h-fit" data-testid="category-list">
          <div className="text-xs uppercase tracking-widest text-rx-ink-3 font-bold mb-2">Catégories</div>
          <div className="space-y-1">
            {categories.map((c) => (
              <div key={c.id} className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer ${activeCat === c.id ? "bg-harissa-soft" : "hover:bg-rx-muted"}`} onClick={() => setActiveCat(c.id)}>
                <div className="text-sm font-medium">{LOCALE_NAME(c.name, lang)}</div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setCatOpen(c); }} className="p-1" data-testid={`edit-cat-${c.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); delCat(c); }} className="p-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {categories.length === 0 && <div className="text-sm text-rx-ink-3 p-2">{t("empty")}</div>}
          </div>
        </div>

        <div className="lg:col-span-3 grid md:grid-cols-2 gap-3">
          {visibleItems.map((i) => (
            <div key={i.id} className="card-rx p-4 flex gap-3" data-testid={`item-card-${i.id}`}>
              <div className="w-20 h-20 rounded-lg bg-rx-muted overflow-hidden flex-shrink-0">
                {i.image_url ? <img src={i.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-rx-ink-3 text-xs">Pas d'image</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold truncate">{LOCALE_NAME(i.name, lang)}</div>
                  {!i.available && <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">Indisponible</span>}
                </div>
                <div className="text-xs text-rx-ink-2 line-clamp-2 mt-1">{LOCALE_NAME(i.description, lang)}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="kpi-number text-lg text-harissa">{formatDZD(i.price)}</div>
                  <div className="flex gap-1">
                    <button onClick={() => setItemOpen(i)} className="p-1.5 rounded hover:bg-rx-muted"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => delItem(i)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {visibleItems.length === 0 && (
            <div className="md:col-span-2 card-rx p-12 text-center text-rx-ink-3">Aucun article dans cette catégorie.</div>
          )}
        </div>
      </div>

      {catOpen !== null && <CategoryForm initial={catOpen.id ? catOpen : null} onClose={() => setCatOpen(null)} onSaved={load} />}
      {itemOpen !== null && <ItemForm initial={itemOpen.id ? itemOpen : null} categories={categories} onClose={() => setItemOpen(null)} onSaved={load} />}
      {ocrOpen && <OcrImportModal onClose={() => setOcrOpen(false)} onImported={load} />}
    </div>
  );
}
