import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    restaurant_name: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);

  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form);
      toast.success("Compte créé !");
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-rx-paper">
      <header className="px-5 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-harissa flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-extrabold">RestaurantOS</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display font-black text-3xl tracking-tight">Créer un compte</h1>
            <p className="text-rx-ink-2 mt-2">60 secondes · sans carte bancaire.</p>
          </div>
          <form onSubmit={submit} className="card-rx p-6 space-y-4" data-testid="register-form">
            <div>
              <label className="text-sm font-medium">Votre nom</label>
              <input className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rx focus:outline-none focus:ring-2 focus:ring-orange-500" value={form.name} onChange={on("name")} required data-testid="register-name" />
            </div>
            <div>
              <label className="text-sm font-medium">Nom du restaurant</label>
              <input className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rx focus:outline-none focus:ring-2 focus:ring-orange-500" value={form.restaurant_name} onChange={on("restaurant_name")} required data-testid="register-restaurant" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input type="email" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rx focus:outline-none focus:ring-2 focus:ring-orange-500" value={form.email} onChange={on("email")} required data-testid="register-email" />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe (6+ caractères)</label>
              <input type="password" minLength={6} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rx focus:outline-none focus:ring-2 focus:ring-orange-500" value={form.password} onChange={on("password")} required data-testid="register-password" />
            </div>
            <button type="submit" disabled={busy} className="btn-harissa w-full disabled:opacity-50" data-testid="register-submit">
              {busy ? "…" : "Créer mon restaurant"}
            </button>
          </form>
          <div className="text-center text-sm text-rx-ink-2 mt-5">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-harissa font-semibold">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
