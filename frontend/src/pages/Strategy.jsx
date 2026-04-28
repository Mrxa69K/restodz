import { Link } from "react-router-dom";
import { Store, ArrowLeft } from "lucide-react";

const Section = ({ n, title, children }) => (
  <section className="py-12 border-t border-rx first:border-0">
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-3">
        <div className="text-xs uppercase tracking-[0.22em] text-harissa font-bold">Section {n}</div>
        <h2 className="mt-2 font-display font-black text-3xl tracking-tight text-rx-ink">{title}</h2>
      </div>
      <div className="lg:col-span-9 text-rx-ink-2 leading-relaxed text-[17px] space-y-4">{children}</div>
    </div>
  </section>
);

const Pill = ({ tone = "slate", children }) => {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-zinc-100 text-zinc-700 border-zinc-200",
    harissa: "bg-harissa-soft text-harissa border-orange-200",
  };
  return <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${tones[tone]}`}>{children}</span>;
};

export default function Strategy() {
  return (
    <div className="min-h-screen bg-rx">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-rx">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-harissa flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-extrabold">RestaurantOS</span>
          </Link>
          <Link to="/" className="btn-ghost text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.22em] text-harissa font-bold">Business Strategy</div>
          <h1 className="mt-3 font-display font-black text-5xl md:text-6xl tracking-tighter leading-[0.95]">
            Pourquoi RestaurantOS, <span className="text-harissa">et pourquoi maintenant</span> en Algérie.
          </h1>
          <p className="mt-6 text-lg text-rx-ink-2 leading-relaxed">
            Analyse de marché, modèle économique, architecture technique et feuille de route.
            Document de référence pour investisseurs, partenaires et équipe produit.
          </p>
        </div>

        <div className="mt-10">
          <Section n="1" title="Validation marché">
            <p><strong>Segments cibles :</strong> fast-food indépendants (Alger, Oran, Constantine), cafés modernes, restaurants mid-tier 20-80 couverts, petites chaînes 2-5 succursales. Taille estimée : <Pill tone="harissa">≈ 45 000 établissements</Pill> avec connexion Internet.</p>
            <p><strong>Points de douleur actuels :</strong> commandes prises sur WhatsApp ou bon papier, aucune visibilité sur CA horaire, menus imprimés coûteux à mettre à jour, perte entre salle/cuisine, pas d'analyse des meilleurs plats.</p>
            <p><strong>Alternatives existantes :</strong> POS chinois/turcs génériques (non localisés, interface anglais uniquement), WhatsApp + Excel, solutions internationales comme Square/Toast (tarifs USD, exigent carte bancaire).</p>
            <p><strong>Préparation digitale :</strong> +90% des patrons possèdent un smartphone Android. 4G disponible en centre urbain. Méfiance envers les paiements en ligne → cash-first <Pill tone="green">Atout majeur</Pill>.</p>
            <p><strong>Disposition à payer :</strong> 3 000–8 000 DA/mois = budget raisonnable pour un restaurant moyen. Gratuit refusé (« pas sérieux »). Le bon prix signale la qualité.</p>
            <p><strong>Barrières :</strong> littératie technique du personnel (mitigée par UI ultra-simple), crainte de rupture Internet (résolue par mode offline), culture du papier (résolue par accompagnement terrain).</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Pill tone="green">Opportunité : 8.5/10</Pill>
              <Pill tone="amber">Risque moyen — adoption lente</Pill>
              <Pill tone="harissa">Verdict : GO</Pill>
              <Pill tone="slate">Positionnement : Simple & local, prix serré</Pill>
            </div>
          </Section>

          <Section n="2" title="Périmètre produit">
            <p><strong>Modules cœur :</strong> Menu Maker trilingue (AR/FR/EN), QR par table, Système de commande dine-in + à emporter, Dashboard temps réel.</p>
            <p><strong>Modules business :</strong> Analytiques ventes (CA, heures de pointe, best-sellers), Suivi stock & achats, Caisse légère intégrée (cash).</p>
            <p><strong>Avancé :</strong> Gestion clients fidèles, insights menu, branding (logo, couleurs), feedback client, multi-succursales.</p>
          </Section>

          <Section n="3" title="Priorisation MVP / V1 / V2">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="card-rx p-5">
                <Pill tone="harissa">MVP · 6 semaines</Pill>
                <ul className="mt-3 space-y-2 text-sm text-rx-ink-2">
                  <li>• Auth + multi-tenant</li>
                  <li>• Menu Maker (AR/FR/EN)</li>
                  <li>• QR par table</li>
                  <li>• Commande client</li>
                  <li>• Écran cuisine</li>
                  <li>• Dashboard KPI de base</li>
                </ul>
              </div>
              <div className="card-rx p-5">
                <Pill tone="amber">V1 · +3 mois</Pill>
                <ul className="mt-3 space-y-2 text-sm text-rx-ink-2">
                  <li>• Analytiques avancées</li>
                  <li>• Stock & achats</li>
                  <li>• Feedback client</li>
                  <li>• Export CSV/PDF</li>
                  <li>• Multi-utilisateurs</li>
                </ul>
              </div>
              <div className="card-rx p-5">
                <Pill tone="slate">V2 · +6 mois</Pill>
                <ul className="mt-3 space-y-2 text-sm text-rx-ink-2">
                  <li>• Multi-succursales</li>
                  <li>• Programme fidélité</li>
                  <li>• Livraison intégrée</li>
                  <li>• App mobile caisse</li>
                  <li>• API partenaires</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section n="4" title="Modèle économique">
            <p><strong>Stratégie de tarification :</strong> SaaS par abonnement mensuel, facturation en DZD, paiement par Baridimob / CCP / virement / espèces (pas de Stripe).</p>
            <p><strong>Paliers :</strong> Essentiel 2 900 DA/mois · Pro 5 900 DA/mois · Chaîne sur devis (à partir de 14 900 DA).</p>
            <p><strong>Flux de revenus :</strong> SaaS (80%), matériel QR (tentes imprimées, support tablette — 10%), services premium (formation, personnalisation — 10%).</p>
            <p><strong>Seuil de rentabilité :</strong> ≈ 120 clients payants au plan Pro couvrent 1 ingénieur full-time + infra. Objectif an 1 : <Pill tone="green">300 clients actifs</Pill>.</p>
          </Section>

          <Section n="5" title="Avantage concurrentiel">
            <p><strong>Vs POS traditionnels :</strong> zéro installation, zéro matériel propriétaire, pas de licence perpétuelle. Simple.</p>
            <p><strong>Vs WhatsApp :</strong> traçabilité complète, pas de perte de commande, analytique auto, QR remplace l'envoi manuel.</p>
            <p><strong>Vs outils internationaux :</strong> prix 5 à 10× moins cher, UI en arabe natif RTL, support local (téléphone en algérien/français), compréhension des spécificités (Ramadan, jours fériés, cash).</p>
            <p><strong>Différenciateurs clés :</strong> <Pill tone="harissa">Localisation totale</Pill> <Pill tone="green">Mode offline-first</Pill> <Pill tone="amber">Cash-native</Pill> <Pill tone="slate">Prix serré DZD</Pill></p>
          </Section>

          <Section n="6" title="Architecture technique">
            <p><strong>Stack :</strong> React (frontend) · FastAPI (backend) · MongoDB (base multi-tenant par `restaurant_id`). JWT auth. Recharts pour l'analytique.</p>
            <p><strong>Multi-tenant :</strong> chaque utilisateur appartient à un restaurant (1 owner = 1 restaurant en MVP, multi-succursales en V2 via groupes).</p>
            <p><strong>Low-bandwidth :</strong> bundle frontend &lt; 300 KB gzipped, images lazy-loaded, API en JSON compact, cache localStorage côté client.</p>
            <p><strong>Flux QR :</strong> QR imprimé → URL publique <code>/m/slug?table=id</code> → menu + commande → POST API public → commande visible en cuisine instantanément.</p>
            <p><strong>Pipeline analytique :</strong> agrégation MongoDB à la volée pour MVP. À l'échelle, pipeline Airflow → data mart quotidien.</p>
          </Section>

          <Section n="7" title="Go-to-market">
            <p><strong>100 premiers clients :</strong> cold-door Alger-centre + Oran (équipe commerciale terrain de 2 personnes), partenariats avec fournisseurs de tablettes, communauté Facebook/Instagram des restaurateurs.</p>
            <p><strong>Onboarding :</strong> démo en 20 minutes sur place, import menu par photo (OCR), formation du chef en 1h, support WhatsApp dédié 7j/7.</p>
            <p><strong>Rétention :</strong> rapport hebdomadaire PDF automatique au propriétaire (CA, best-sellers, alertes stock), NPS trimestriel, feature request tracker.</p>
          </Section>

          <Section n="8" title="Analyse des risques">
            <p><strong>Marché :</strong> adoption lente <Pill tone="amber">mitigation : plan Essentiel à 2 900 DA</Pill></p>
            <p><strong>Technique :</strong> coupures Internet <Pill tone="green">mitigation : mode offline</Pill>. Androïds bas de gamme <Pill tone="green">mitigation : UI ultra-légère</Pill>.</p>
            <p><strong>Opérationnel :</strong> charge support <Pill tone="amber">mitigation : vidéos tutoriel + WhatsApp groupes</Pill>. Rupture de paiement <Pill tone="slate">mitigation : CCP + virement</Pill>.</p>
          </Section>

          <Section n="9" title="Vision produit & roadmap 6 mois">
            <p>
              <strong>Mois 1–2 :</strong> MVP en prod chez 3 restaurants pilotes (Alger-centre).<br />
              <strong>Mois 3 :</strong> 25 clients payants. V1 modules stock + analytiques avancées.<br />
              <strong>Mois 4–5 :</strong> 100 clients. Expansion Oran + Constantine. Équipe terrain 4 personnes.<br />
              <strong>Mois 6 :</strong> 250 clients, seuil de rentabilité en vue. Début V2 multi-succursales.
            </p>
            <div className="mt-6 p-6 rounded-2xl bg-zinc-950 text-white">
              <div className="text-xs uppercase tracking-widest text-harissa font-bold">Verdict</div>
              <div className="mt-2 font-display font-black text-2xl">
                Le marché est prêt. L'outil n'existe pas encore. Le timing est maintenant. GO.
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-12 flex gap-3">
          <Link to="/register" className="btn-harissa">Démarrer un essai</Link>
          <Link to="/" className="btn-ghost">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
