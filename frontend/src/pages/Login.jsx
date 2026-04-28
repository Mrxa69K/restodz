import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("karim@restaurantos.dz");
  const [password, setPassword] = useState("Karim2026!");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Bienvenue !");
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
        <Link to="/" className="flex items-center gap-2" data-testid="login-logo">
          <div className="w-8 h-8 rounded-lg bg-harissa flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-extrabold">RestaurantOS</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display font-black text-3xl tracking-tight">Connexion</h1>
            <p className="text-rx-ink-2 mt-2">Accédez à votre tableau de bord.</p>
          </div>
          <form onSubmit={submit} className="card-rx p-6 space-y-4" data-testid="login-form">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rx focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe</label>
              <input
                type="password"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-rx focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn-harissa w-full disabled:opacity-50"
              data-testid="login-submit"
            >
              {busy ? "…" : "Se connecter"}
            </button>
            <div className="text-xs text-rx-ink-2 text-center">
              Compte démo pré-rempli · Chez Karim
            </div>
          </form>
          <div className="text-center text-sm text-rx-ink-2 mt-5">
            Pas de compte ?{" "}
            <Link to="/register" className="text-harissa font-semibold" data-testid="login-to-register">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
