import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { restaurant, setState, user } = useAuth();
  const [f, setF] = useState({
    name: restaurant?.name || "",
    slug: restaurant?.slug || "",
    phone: restaurant?.phone || "",
    address: restaurant?.address || "",
    logo_url: restaurant?.logo_url || "",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch("/restaurant", f);
      setState((s) => ({ ...s, restaurant: data }));
      toast.success("Enregistré");
    } catch (e) { toast.error("Erreur"); }
    setBusy(false);
  };

  const publicUrl = `/m/${restaurant?.slug || ""}`;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto" data-testid="settings-page">
      <h1 className="font-display font-black text-3xl tracking-tight mb-1">Paramètres</h1>
      <p className="text-rx-ink-2 mb-6">Profil du restaurant, branding et URL publique.</p>

      <div className="card-rx p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nom du restaurant" value={f.name} onChange={(v) => setF({ ...f, name: v })} testid="settings-name" />
          <Field label="Slug (URL publique)" value={f.slug} onChange={(v) => setF({ ...f, slug: v })} testid="settings-slug" />
          <Field label="Téléphone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
          <Field label="Logo URL" value={f.logo_url} onChange={(v) => setF({ ...f, logo_url: v })} />
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Adresse</label>
            <textarea className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm text-rx-ink-2">
            URL publique :
            <Link to={publicUrl} target="_blank" className="text-harissa font-semibold ms-2 inline-flex items-center gap-1">
              {publicUrl} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          <button className="btn-harissa disabled:opacity-50" onClick={save} disabled={busy} data-testid="settings-save">
            {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="card-rx p-6 mt-4">
        <h3 className="font-display font-bold text-lg mb-2">Compte</h3>
        <div className="text-sm text-rx-ink-2">Email : <span className="text-rx-ink font-medium">{user?.email}</span></div>
        <div className="text-sm text-rx-ink-2">Propriétaire : <span className="text-rx-ink font-medium">{user?.name}</span></div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, testid }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">{label}</label>
      <input className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </div>
  );
}
