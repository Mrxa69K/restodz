import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, Shield } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const ROLE_LABEL = {
  owner: "Propriétaire",
  manager: "Manager",
  kitchen: "Cuisine",
  waiter: "Serveur",
};

const ROLE_DESC = {
  manager: "Accès complet sauf gestion de l'équipe.",
  kitchen: "Voit uniquement les commandes et l'écran cuisine.",
  waiter: "Gère les tables et les commandes.",
};

function StaffModal({ initial, onClose, onSaved, currentRole }) {
  const [f, setF] = useState({
    email: initial?.email || "",
    name: initial?.name || "",
    password: "",
    role: initial?.role || "waiter",
  });
  const [busy, setBusy] = useState(false);
  const canPickManager = currentRole === "owner";

  const save = async () => {
    if (!initial && !f.password) return toast.error("Mot de passe requis");
    setBusy(true);
    try {
      if (initial) {
        const body = { name: f.name, role: f.role };
        if (f.password) body.password = f.password;
        await api.patch(`/staff/${initial.id}`, body);
      } else {
        await api.post("/staff", f);
      }
      toast.success("Enregistré");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erreur");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-rx flex items-center justify-between">
          <div className="font-display font-bold text-lg">{initial ? "Modifier membre" : "Nouveau membre"}</div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Nom</label>
            <input className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="staff-name" />
          </div>
          {!initial && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Email</label>
              <input type="email" className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="staff-email" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Mot de passe {initial && <span className="text-rx-ink-3 normal-case tracking-normal">(laisser vide pour ne pas changer)</span>}</label>
            <input type="password" className="mt-1 w-full px-3 py-2 rounded-lg border border-rx" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="staff-password" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rx-ink-3">Rôle</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["manager", "kitchen", "waiter"].map((r) => {
                const disabled = r === "manager" && !canPickManager;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={disabled}
                    onClick={() => setF({ ...f, role: r })}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                      f.role === r ? "bg-harissa-soft border-orange-300 text-harissa" : "bg-white border-rx text-rx-ink-2"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    data-testid={`staff-role-${r}`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-rx-ink-3 mt-2">{ROLE_DESC[f.role]}</p>
          </div>
        </div>
        <div className="p-5 border-t border-rx flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} disabled={busy} className="btn-harissa disabled:opacity-50" data-testid="staff-save">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(null);

  const load = async () => {
    const { data } = await api.get("/staff");
    setStaff(data);
  };
  useEffect(() => { load(); }, []);

  const del = async (s) => {
    if (!window.confirm(`Supprimer ${s.name} ?`)) return;
    try {
      await api.delete(`/staff/${s.id}`);
      toast.success("Supprimé");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Erreur"); }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto" data-testid="staff-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tight">Équipe</h1>
          <p className="text-rx-ink-2 mt-1">Gérez les accès de vos collaborateurs.</p>
        </div>
        <button className="btn-harissa inline-flex items-center gap-2" onClick={() => setOpen({})} data-testid="add-staff">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="card-rx overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-rx-muted">
            <tr className="text-left text-xs uppercase tracking-wider text-rx-ink-3">
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rôle</th>
              <th className="p-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-rx" data-testid={`staff-row-${s.id}`}>
                <td className="p-3 font-medium">
                  {s.name}
                  {s.id === user?.id && <span className="ms-2 text-xs bg-harissa-soft text-harissa px-2 py-0.5 rounded">Vous</span>}
                </td>
                <td className="p-3 text-rx-ink-2">{s.email}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border ${
                    s.role === "owner" ? "bg-harissa-soft border-orange-200 text-harissa" :
                    s.role === "manager" ? "bg-blue-50 border-blue-200 text-blue-700" :
                    s.role === "kitchen" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                    "bg-zinc-100 border-zinc-200 text-zinc-700"
                  }`}>
                    <Shield className="w-3 h-3" /> {ROLE_LABEL[s.role]}
                  </span>
                </td>
                <td className="p-3 text-end">
                  {s.role !== "owner" && s.id !== user?.id && (
                    <div className="inline-flex gap-1">
                      <button onClick={() => setOpen(s)} className="p-1.5 rounded hover:bg-rx-muted" data-testid={`edit-staff-${s.id}`}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => del(s)} className="p-1.5 rounded hover:bg-red-50 text-red-500" data-testid={`del-staff-${s.id}`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-rx-ink-3">
        Comptes de test : <code>manager@restaurantos.dz</code> / <code>Manager2026!</code> · <code>kitchen@restaurantos.dz</code> / <code>Kitchen2026!</code> · <code>waiter@restaurantos.dz</code> / <code>Waiter2026!</code>
      </div>

      {open !== null && <StaffModal initial={open.id ? open : null} onClose={() => setOpen(null)} onSaved={load} currentRole={user?.role} />}
    </div>
  );
}
