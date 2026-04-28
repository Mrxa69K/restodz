import { Link } from "react-router-dom";
import {
  ChefHat, QrCode, BarChart3, Boxes, Globe, CheckCircle2,
  Store, MessageSquare, Zap, ShieldCheck, Wifi, Users,
} from "lucide-react";
import { useI18n } from "@/context/I18nContext";

const HERO_BG = "https://images.unsplash.com/photo-1648808694138-6706c5efc80a?crop=entropy&cs=srgb&fm=jpg&w=1800&q=85";
const KITCHEN_IMG = "https://images.pexels.com/photos/8629081/pexels-photo-8629081.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const QR_IMG = "https://images.unsplash.com/photo-1706759755964-b0aa57a58c5a?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85";

function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-rx">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="home-logo">
          <div className="w-8 h-8 rounded-lg bg-harissa flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-tight">RestaurantOS</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-rx-ink-2">
          <a href="#features" className="hover:text-rx-ink">Fonctions</a>
          <a href="#pricing" className="hover:text-rx-ink">Tarifs</a>
          <Link to="/strategy" className="hover:text-rx-ink" data-testid="nav-strategy">Stratégie</Link>
          <Link to="/m/chez-karim" className="hover:text-rx-ink" data-testid="nav-demo-menu">Menu démo</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost text-sm" data-testid="nav-login">Connexion</Link>
          <Link to="/register" className="btn-harissa text-sm" data-testid="nav-register">Commencer</Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-rx bg-white">
      <div className="max-w-7xl mx-auto px-5 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-harissa flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-extrabold">RestaurantOS</span>
          </div>
          <p className="text-rx-ink-2 leading-relaxed">
            Le système d'exploitation des restaurants algériens. Cash-first, offline-friendly, trilingue.
          </p>
        </div>
        <div>
          <div className="font-semibold mb-3">Produit</div>
          <ul className="space-y-2 text-rx-ink-2">
            <li><a href="#features">Fonctions</a></li>
            <li><a href="#pricing">Tarifs</a></li>
            <li><Link to="/strategy">Stratégie</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Compte</div>
          <ul className="space-y-2 text-rx-ink-2">
            <li><Link to="/login">Connexion</Link></li>
            <li><Link to="/register">Créer un compte</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Contact</div>
          <ul className="space-y-2 text-rx-ink-2">
            <li>Alger · Oran · Constantine</li>
            <li>contact@restaurantos.dz</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-rx text-xs text-rx-ink-3 text-center py-5">
        © 2026 RestaurantOS · Fabriqué en Algérie
      </div>
    </footer>
  );
}

function Kicker({ children }) {
  return (
    <div className="inline-flex items-center gap-2 bg-harissa-soft text-harissa text-xs font-semibold uppercase tracking-[0.18em] rounded-full px-3 py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-harissa pulse-dot" />
      {children}
    </div>
  );
}

function Feature({ icon: Icon, title, desc, tone = "slate" }) {
  const toneMap = {
    slate: "bg-white border-rx",
    dark: "bg-zinc-950 text-white border-zinc-900",
  };
  return (
    <div className={`p-6 rounded-2xl border ${toneMap[tone]}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone === "dark" ? "bg-white/10 text-white" : "bg-harissa-soft text-harissa"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4 font-display font-bold text-lg">{title}</div>
      <p className={`mt-2 text-sm leading-relaxed ${tone === "dark" ? "text-zinc-300" : "text-rx-ink-2"}`}>{desc}</p>
    </div>
  );
}

export default function Landing() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-rx" data-testid="landing-page">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 pt-16 pb-24 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 anim-fade-up">
            <Kicker>Pensé pour l'Algérie · 100% DZD</Kicker>
            <h1 className="mt-5 font-display font-black tracking-tighter text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-rx-ink">
              Le cerveau opérationnel<br />
              <span className="text-harissa">de votre restaurant.</span>
            </h1>
            <p className="mt-3 text-right text-xl font-arabic text-rx-ink-2">
              نظام إدارة مطعمك كامل · بالدينار · بدون بطاقة
            </p>
            <p className="mt-6 text-lg text-rx-ink-2 leading-relaxed max-w-2xl">
              QR à table, cuisine temps réel, analytiques et stock — tout en un seul outil adapté aux
              cafés et restaurants d'Alger, Oran, Constantine. Fonctionne sur Android bas de gamme
              et en connexion faible.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-harissa inline-flex items-center gap-2" data-testid="cta-register">
                Essayer gratuitement <Zap className="w-4 h-4" />
              </Link>
              <Link to="/m/chez-karim" className="btn-ghost inline-flex items-center gap-2" data-testid="cta-demo">
                Voir un menu client
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "+12%", v: "Ticket moyen" },
                { k: "-40%", v: "Erreurs commande" },
                { k: "3 langues", v: "AR · FR · EN" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="kpi-number text-2xl text-rx-ink">{s.k}</div>
                  <div className="text-xs uppercase tracking-wider text-rx-ink-3 mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border border-rx shadow-sm anim-fade-up anim-delay-2">
              <img src={HERO_BG} alt="Café moderne" className="w-full h-[460px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 start-4 end-4 card-rx p-4 bg-white/95 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-rx-ink-3 uppercase tracking-wider">Aujourd'hui</div>
                    <div className="kpi-number text-3xl text-rx-ink">48 200 DA</div>
                  </div>
                  <div className="text-right rtl:text-left">
                    <div className="text-xs text-rx-ink-3">Commandes</div>
                    <div className="kpi-number text-2xl text-rx-ink">37</div>
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-1 h-12">
                  {[18, 32, 26, 41, 58, 72, 50, 36, 44, 62, 48, 30].map((h, i) => (
                    <div key={i} className="flex-1 bg-harissa rounded-sm" style={{ height: `${h}%`, opacity: 0.4 + i * 0.05 }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -top-6 -end-6 w-32 h-32 rounded-2xl bg-harissa hidden lg:flex items-center justify-center rotate-6">
              <div className="text-white font-display font-black text-center leading-tight text-sm">
                SANS CB<br />SANS STRIPE<br />CASH-FIRST
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="border-y border-rx bg-white">
        <div className="max-w-7xl mx-auto px-5 py-16 grid lg:grid-cols-2 gap-12">
          <div>
            <Kicker>Le problème</Kicker>
            <h2 className="mt-4 font-display font-black text-4xl tracking-tight text-rx-ink">
              Vos commandes passent par WhatsApp. Votre caisse est un cahier. Vos ventes, une estimation.
            </h2>
            <ul className="mt-6 space-y-3 text-rx-ink-2">
              {[
                "Commandes perdues entre la salle et la cuisine",
                "Aucune visibilité sur les ventes horaires / meilleurs plats",
                "Menus papier coûteux et impossibles à mettre à jour",
                "Outils internationaux trop chers et non localisés",
              ].map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 bg-harissa rounded-full" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Kicker>La solution</Kicker>
            <h2 className="mt-4 font-display font-black text-4xl tracking-tight text-rx-ink">
              Un seul outil pour le service, la cuisine et le chef d'entreprise.
            </h2>
            <ul className="mt-6 space-y-3 text-rx-ink-2">
              {[
                "QR code à chaque table → menu trilingue → commande instantanée",
                "Écran cuisine temps réel (En attente / En cours / Prêt)",
                "Dashboard KPI en DZD : CA, tickets, tables, best-sellers",
                "Fonctionne sur Android bas de gamme, connexion 3G",
              ].map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-harissa flex-shrink-0 mt-0.5" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-rx-paper">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <div className="max-w-2xl">
            <Kicker>Tout en un</Kicker>
            <h2 className="mt-4 font-display font-black text-4xl md:text-5xl tracking-tight">
              Les modules qui font tourner un restaurant.
            </h2>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            <Feature icon={QrCode} title="QR par table" desc="Un QR par table → menu digital → la commande arrive directement en cuisine." />
            <Feature icon={ChefHat} title="Cuisine temps réel" desc="Kanban 'En attente / En cours / Prêt' avec chrono. Zéro confusion." />
            <Feature icon={BarChart3} title="Analytiques DZD" desc="CA du jour, ticket moyen, heures de pointe, top plats — tout en dinar." />
            <Feature icon={Boxes} title="Stock & achats" desc="Suivez farine, huile, viande. Alerte seuil bas avant la rupture." />
            <Feature icon={Globe} title="Menu trilingue" desc="AR · FR · EN. RTL natif pour le client arabophone." tone="dark" />
            <Feature icon={Wifi} title="Mode faible connexion" desc="Le dashboard et le menu client sont optimisés 3G et Android low-end." />
          </div>

          <div className="mt-16 grid lg:grid-cols-2 gap-6">
            <div className="relative rounded-3xl overflow-hidden border border-rx min-h-[340px]">
              <img src={KITCHEN_IMG} alt="Cuisine" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="relative p-8 h-full flex flex-col justify-end text-white">
                <Kicker>Écran cuisine</Kicker>
                <h3 className="mt-3 font-display font-black text-3xl">Le rush ne vous submerge plus.</h3>
                <p className="mt-2 text-zinc-200 max-w-md">
                  Chaque ticket s'affiche avec son chrono. Les ordres les plus anciens deviennent
                  oranges puis rouges. Un clic → "Prêt".
                </p>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden border border-rx min-h-[340px]">
              <img src={QR_IMG} alt="QR" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="relative p-8 h-full flex flex-col justify-end text-white">
                <Kicker>Scan → Commande</Kicker>
                <h3 className="mt-3 font-display font-black text-3xl">Le client commande seul, en 40 secondes.</h3>
                <p className="mt-2 text-zinc-200 max-w-md">
                  Pas d'application à installer. Le QR ouvre le menu dans le navigateur.
                  Il choisit sa langue, ajoute au panier, valide.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-white border-y border-rx">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <div className="max-w-2xl">
            <Kicker>Tarifs transparents · en DZD</Kicker>
            <h2 className="mt-4 font-display font-black text-4xl md:text-5xl tracking-tight">
              Un prix adapté à la réalité algérienne.
            </h2>
            <p className="mt-4 text-rx-ink-2 text-lg">
              Pas de carte bancaire requise. Paiement possible par Baridimob, CCP ou espèces.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              { name: "Essentiel", price: "2 900", items: ["1 restaurant", "Menu & QR illimités", "Dashboard basique", "5 tables", "Support email"] },
              { name: "Pro", price: "5 900", featured: true, items: ["Tables illimitées", "Cuisine temps réel", "Analytiques avancées", "Stock & achats", "Support prioritaire"] },
              { name: "Chaîne", price: "Sur devis", items: ["Multi-succursales", "API & intégrations", "Formation sur site", "SLA 99.9%", "Account manager"] },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 ${p.featured ? "border-harissa bg-harissa-soft" : "border-rx bg-white"}`}
                data-testid={`plan-${p.name.toLowerCase()}`}
              >
                {p.featured && (
                  <div className="inline-block bg-harissa text-white text-xs font-bold px-2 py-1 rounded">
                    LE PLUS CHOISI
                  </div>
                )}
                <div className="mt-3 font-display font-bold text-xl">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="kpi-number text-5xl">{p.price}</span>
                  {p.price !== "Sur devis" && <span className="text-rx-ink-2 font-semibold">DA / mois</span>}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-rx-ink-2">
                  {p.items.map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-harissa flex-shrink-0 mt-0.5" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-6 w-full inline-flex items-center justify-center py-3 rounded-lg font-semibold ${p.featured ? "bg-rx-ink text-white" : "btn-harissa"}`}
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-zinc-950 text-white">
        <div className="max-w-7xl mx-auto px-5 py-20 grid lg:grid-cols-3 gap-10 items-center">
          <div>
            <Kicker>Terrain</Kicker>
            <h2 className="mt-4 font-display font-black text-4xl tracking-tight">
              Testé chez <span className="text-harissa">Chez Karim</span>, Alger-centre.
            </h2>
          </div>
          <blockquote className="lg:col-span-2 text-xl leading-relaxed text-zinc-200">
            <MessageSquare className="w-8 h-8 text-harissa mb-4" />
            "Avant, j'avais trois carnets et du scotch sur le mur. En deux semaines,
            le chef voit les commandes en temps réel et moi je sais, chaque soir en 30 secondes,
            ce que j'ai fait dans la journée. C'est sérieux."
            <div className="mt-4 text-sm text-rx-ink-3 uppercase tracking-wider">
              Karim B. — propriétaire, 38 couverts
            </div>
          </blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-5 py-20 text-center">
          <Kicker>Essai gratuit · sans CB</Kicker>
          <h2 className="mt-5 font-display font-black text-4xl md:text-6xl tracking-tighter">
            Arrêtez de gérer votre restaurant avec un cahier.
          </h2>
          <p className="mt-5 text-lg text-rx-ink-2">
            Inscription en 60 secondes. Un compte démo pré-rempli avec vrai menu algérien.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/register" className="btn-harissa" data-testid="cta-footer-register">Créer mon compte</Link>
            <Link to="/m/chez-karim" className="btn-ghost" data-testid="cta-footer-demo">Voir un menu client</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
