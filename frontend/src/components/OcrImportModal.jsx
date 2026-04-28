import { useState, useRef } from "react";
import { Upload, Sparkles, Check, X, Loader2, Image as ImageIcon } from "lucide-react";
import api, { formatDZD, API } from "@/lib/api";
import { toast } from "sonner";

export default function OcrImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // {categories, items, model}
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const inputRef = useRef(null);

  const pick = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Fichier image requis");
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("rx_token");
      const res = await fetch(`${API}/menu/ocr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Erreur" }));
        throw new Error(err.detail || "Erreur OCR");
      }
      const data = await res.json();
      setResult(data);
      // pre-select everything
      setSelected(new Set(data.items.map((_, idx) => idx)));
      if (data.items.length === 0) toast.warning("Aucun article détecté");
      else toast.success(`${data.items.length} articles extraits`);
    } catch (e) {
      toast.error(e.message || "Erreur OCR");
    }
    setLoading(false);
  };

  const toggle = (idx) => {
    const n = new Set(selected);
    if (n.has(idx)) n.delete(idx);
    else n.add(idx);
    setSelected(n);
  };

  const updateItem = (idx, key, lang, value) => {
    setResult((r) => {
      const items = [...r.items];
      if (lang) items[idx] = { ...items[idx], [key]: { ...items[idx][key], [lang]: value } };
      else items[idx] = { ...items[idx], [key]: value };
      return { ...r, items };
    });
  };

  const apply = async () => {
    if (!result) return;
    const chosen = result.items.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return toast.error("Aucun article sélectionné");
    setImporting(true);
    try {
      const needed_cats = new Set(chosen.map((c) => c.category_name_fr));
      const cats = result.categories.filter((c) => needed_cats.has(c.name.fr));
      const { data } = await api.post("/menu/ocr/apply", { categories: cats, items: chosen });
      toast.success(`${data.created_items} article(s) et ${data.created_categories} catégorie(s) importés`);
      onImported?.();
      onClose();
    } catch (e) {
      toast.error("Erreur à l'import");
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-rx flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-harissa-soft text-harissa flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-display font-bold text-lg">Import par photo (IA)</div>
              <div className="text-xs text-rx-ink-3">Photographiez un menu papier · extraction et traduction automatiques</div>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!result && (
            <div>
              {!preview ? (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full border-2 border-dashed border-rx rounded-2xl p-12 flex flex-col items-center gap-3 hover:bg-rx-muted transition-colors"
                  data-testid="ocr-pick-file"
                >
                  <div className="w-14 h-14 rounded-full bg-harissa-soft text-harissa flex items-center justify-center">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div className="font-semibold text-lg">Choisir une photo de menu</div>
                  <div className="text-sm text-rx-ink-3">JPG, PNG ou WEBP · max 8 Mo</div>
                </button>
              ) : (
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative rounded-xl overflow-hidden border border-rx">
                      <img src={preview} alt="preview" className="w-full max-h-[400px] object-contain bg-rx-muted" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => { setFile(null); setPreview(null); }} className="btn-ghost text-sm" data-testid="ocr-change-file">Changer</button>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="card-rx p-5">
                      <div className="font-display font-bold text-lg mb-2">Prêt à analyser ?</div>
                      <p className="text-sm text-rx-ink-2 mb-4">
                        L'IA va identifier chaque plat, son prix et sa catégorie, puis traduire les noms
                        en arabe, français et anglais. Vous pourrez corriger avant d'importer.
                      </p>
                      <button onClick={analyze} disabled={loading} className="btn-harissa w-full inline-flex items-center justify-center gap-2 disabled:opacity-50" data-testid="ocr-analyze">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…</> : <><Sparkles className="w-4 h-4" /> Analyser le menu</>}
                      </button>
                      <div className="text-xs text-rx-ink-3 mt-3 text-center">
                        Propulsé par Groq Llama 4 · ~3–6 secondes
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>
          )}

          {result && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-display font-bold text-lg">{result.items.length} articles extraits</div>
                  <div className="text-xs text-rx-ink-3">{selected.size} sélectionnés · {result.categories.length} catégories</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set(result.items.map((_, i) => i)))} className="text-sm text-rx-ink-2 hover:text-rx-ink">Tout</button>
                  <span className="text-rx-ink-3">·</span>
                  <button onClick={() => setSelected(new Set())} className="text-sm text-rx-ink-2 hover:text-rx-ink">Aucun</button>
                </div>
              </div>

              <div className="space-y-2">
                {result.items.map((it, idx) => {
                  const on = selected.has(idx);
                  return (
                    <div key={idx} className={`card-rx p-3 flex gap-3 ${on ? "" : "opacity-50"}`} data-testid={`ocr-item-${idx}`}>
                      <button
                        onClick={() => toggle(idx)}
                        className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center ${on ? "bg-harissa text-white" : "bg-white border border-rx"}`}
                        data-testid={`ocr-toggle-${idx}`}
                      >
                        {on && <Check className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input value={it.name.fr} onChange={(e) => updateItem(idx, "name", "fr", e.target.value)} placeholder="FR" className="px-2 py-1.5 rounded border border-rx text-sm" />
                        <input value={it.name.ar} onChange={(e) => updateItem(idx, "name", "ar", e.target.value)} placeholder="AR" className="px-2 py-1.5 rounded border border-rx text-sm" dir="rtl" />
                        <input value={it.name.en} onChange={(e) => updateItem(idx, "name", "en", e.target.value)} placeholder="EN" className="px-2 py-1.5 rounded border border-rx text-sm" />
                        <div className="flex gap-1 items-center">
                          <input type="number" value={it.price} onChange={(e) => updateItem(idx, "price", null, Number(e.target.value))} className="w-24 px-2 py-1.5 rounded border border-rx text-sm text-end" />
                          <span className="text-sm text-rx-ink-3">DA</span>
                        </div>
                      </div>
                      <div className="text-xs text-rx-ink-3 self-center whitespace-nowrap">{it.category_name_fr}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className="p-5 border-t border-rx flex items-center justify-between bg-rx-paper">
            <div className="text-sm text-rx-ink-2">
              {selected.size} article(s) seront ajoutés au menu
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setResult(null); setFile(null); setPreview(null); }} className="btn-ghost">Recommencer</button>
              <button onClick={apply} disabled={importing || selected.size === 0} className="btn-harissa disabled:opacity-50 inline-flex items-center gap-2" data-testid="ocr-import">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
