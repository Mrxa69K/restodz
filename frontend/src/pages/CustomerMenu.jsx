import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Plus, Minus, ShoppingCart, X, Store, Check, Star } from "lucide-react";
import api, { formatDZD, LOCALE_NAME } from "@/lib/api";
import { toast } from "sonner";

export default function CustomerMenu() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const tableId = sp.get("table");
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem("rx_menu_lang") || "fr");
  const [cart, setCart] = useState({}); // item_id -> qty
  const [activeCat, setActiveCat] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [fbOpen, setFbOpen] = useState(false);
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState("");
  const [fbName, setFbName] = useState("");
  const [fbSent, setFbSent] = useState(false);

  useEffect(() => {
    api.get(`/public/restaurant/${slug}`).then(({ data }) => {
      setData(data);
      setActiveCat(data.categories[0]?.id);
    }).catch(() => setData({ __notfound: true }));
  }, [slug]);

  useEffect(() => {
    localStorage.setItem("rx_menu_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const addQty = (id, delta) => {
    setCart((c) => {
      const n = { ...c };
      n[id] = Math.max(0, (n[id] || 0) + delta);
      if (n[id] === 0) delete n[id];
      return n;
    });
  };

  const cartItems = useMemo(() => {
    if (!data) return [];
    return Object.entries(cart).map(([id, qty]) => {
      const item = data.items.find((x) => x.id === id);
      return { ...item, qty };
    });
  }, [cart, data]);

  const total = cartItems.reduce((a, b) => a + b.price * b.qty, 0);
  const totalCount = cartItems.reduce((a, b) => a + b.qty, 0);

  const place = async () => {
    if (totalCount === 0) return;
    try {
      const payload = {
        table_id: tableId || null,
        type: tableId ? "dine_in" : "takeaway",
        items: cartItems.map((i) => ({ item_id: i.id, quantity: i.qty, note: "" })),
        note: "",
      };
      const { data: order } = await api.post(`/public/restaurant/${slug}/order`, payload);
      setPlaced(order);
      setCart({});
      setCartOpen(false);
    } catch (e) { toast.error("Erreur"); }
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;
  if (data.__notfound) return <div className="min-h-screen flex items-center justify-center text-rx-ink-2">Restaurant introuvable</div>;

  const L = {
    fr: { menu: "Menu", cart: "Mon panier", submit: "Envoyer la commande", empty: "Votre panier est vide", qty: "Quantité", takeaway: "À emporter", table: "Table", placed: "Commande envoyée !", placed_desc: "Votre commande a été envoyée en cuisine.", leave_fb: "Laisser un avis", rate: "Notez votre expérience", fb_name: "Votre prénom (facultatif)", fb_comment: "Commentaire (facultatif)", send: "Envoyer", fb_thanks: "Merci pour votre avis !", new_order: "Nouvelle commande" },
    ar: { menu: "القائمة", cart: "سلتي", submit: "إرسال الطلب", empty: "السلة فارغة", qty: "الكمية", takeaway: "للأخذ", table: "طاولة", placed: "تم إرسال الطلب!", placed_desc: "تم إرسال طلبك إلى المطبخ.", leave_fb: "أضف تقييمك", rate: "قيم تجربتك", fb_name: "اسمك (اختياري)", fb_comment: "تعليق (اختياري)", send: "إرسال", fb_thanks: "شكراً على تقييمك!", new_order: "طلب جديد" },
    en: { menu: "Menu", cart: "My cart", submit: "Place order", empty: "Your cart is empty", qty: "Quantity", takeaway: "Takeaway", table: "Table", placed: "Order placed!", placed_desc: "Your order has been sent to the kitchen.", leave_fb: "Leave feedback", rate: "Rate your experience", fb_name: "Your name (optional)", fb_comment: "Comment (optional)", send: "Send", fb_thanks: "Thanks for your feedback!", new_order: "New order" },
  }[lang];

  const sendFeedback = async () => {
    if (fbRating < 1) return;
    try {
      await api.post(`/public/restaurant/${slug}/feedback`, {
        rating: fbRating,
        comment: fbComment,
        customer_name: fbName,
        order_id: placed?.id || null,
      });
      setFbSent(true);
      setTimeout(() => {
        setFbOpen(false);
        setPlaced(null);
        setFbSent(false);
        setFbRating(0); setFbComment(""); setFbName("");
      }, 1500);
    } catch (e) { toast.error("Erreur"); }
  };

  const tableLabel = data.tables.find((x) => x.id === tableId)?.label;

  return (
    <div className="min-h-screen bg-rx-paper pb-32" data-testid="customer-menu" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* header */}
      <header className="sticky top-0 z-30 bg-white border-b border-rx">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-harissa flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold truncate">{data.restaurant.name}</div>
              <div className="text-xs text-rx-ink-3">
                {tableLabel ? `${L.table} · ${tableLabel}` : L.takeaway}
              </div>
            </div>
          </div>
          <div className="flex gap-1 bg-rx-muted p-1 rounded-full text-xs">
            {["fr", "ar", "en"].map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-full font-semibold ${lang === l ? "bg-white" : "text-rx-ink-2"}`} data-testid={`menu-lang-${l}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {/* categories scroll */}
        <div className="max-w-3xl mx-auto px-4 pb-3 overflow-x-auto scroll-soft">
          <div className="flex gap-2">
            {data.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => { setActiveCat(c.id); document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold ${activeCat === c.id ? "bg-rx-ink text-white" : "bg-white border border-rx text-rx-ink-2"}`}
                data-testid={`menu-cat-${c.id}`}
              >
                {LOCALE_NAME(c.name, lang)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* items */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        {data.categories.map((c) => {
          const items = data.items.filter((i) => i.category_id === c.id);
          if (items.length === 0) return null;
          return (
            <section key={c.id} id={`cat-${c.id}`}>
              <h2 className="font-display font-black text-2xl mb-3">{LOCALE_NAME(c.name, lang)}</h2>
              <div className="space-y-3">
                {items.map((i) => {
                  const qty = cart[i.id] || 0;
                  return (
                    <div key={i.id} className="card-rx p-3 flex gap-3" data-testid={`menu-item-${i.id}`}>
                      {i.image_url && <img src={i.image_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{LOCALE_NAME(i.name, lang)}</div>
                        <div className="text-xs text-rx-ink-2 line-clamp-2 mt-0.5">{LOCALE_NAME(i.description, lang)}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="kpi-number text-lg text-harissa">{formatDZD(i.price)}</div>
                          {qty === 0 ? (
                            <button onClick={() => addQty(i.id, 1)} className="btn-harissa text-xs py-1.5 px-3 inline-flex items-center gap-1" data-testid={`add-to-cart-${i.id}`}>
                              <Plus className="w-3.5 h-3.5" /> Ajouter
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 bg-rx-muted rounded-full p-1">
                              <button onClick={() => addQty(i.id, -1)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center" data-testid={`minus-${i.id}`}><Minus className="w-4 h-4" /></button>
                              <div className="w-5 text-center font-bold">{qty}</div>
                              <button onClick={() => addQty(i.id, 1)} className="w-8 h-8 rounded-full bg-harissa text-white flex items-center justify-center" data-testid={`plus-${i.id}`}><Plus className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* floating cart */}
      {totalCount > 0 && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 btn-harissa inline-flex items-center gap-3 shadow-lg py-3 px-5 z-20" data-testid="open-cart">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold">{totalCount} · {formatDZD(total)}</span>
          <span className="text-sm font-semibold opacity-90">{L.cart}</span>
        </button>
      )}

      {/* cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setCartOpen(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-rx flex items-center justify-between">
              <div className="font-display font-bold text-lg">{L.cart}</div>
              <button onClick={() => setCartOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cartItems.length === 0 && <div className="text-center text-rx-ink-3 py-8">{L.empty}</div>}
              {cartItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 border-b border-rx last:border-0 pb-2">
                  <div className="flex-1">
                    <div className="font-semibold">{LOCALE_NAME(i.name, lang)}</div>
                    <div className="text-xs text-rx-ink-3">{formatDZD(i.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => addQty(i.id, -1)} className="w-7 h-7 rounded-full border border-rx"><Minus className="w-3.5 h-3.5 mx-auto" /></button>
                    <div className="w-6 text-center font-bold">{i.qty}</div>
                    <button onClick={() => addQty(i.id, 1)} className="w-7 h-7 rounded-full bg-harissa text-white"><Plus className="w-3.5 h-3.5 mx-auto" /></button>
                  </div>
                  <div className="w-20 text-end font-bold">{formatDZD(i.price * i.qty)}</div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-rx">
              <div className="flex items-center justify-between mb-3">
                <div className="text-rx-ink-2">Total</div>
                <div className="kpi-number text-2xl">{formatDZD(total)}</div>
              </div>
              <button onClick={place} disabled={totalCount === 0} className="btn-harissa w-full disabled:opacity-50" data-testid="submit-order">
                {L.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* placed modal */}
      {placed && !fbOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center" data-testid="order-placed">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <div className="mt-4 font-display font-black text-2xl">{L.placed}</div>
            <div className="text-rx-ink-2 mt-2">{L.placed_desc}</div>
            <div className="mt-4 text-sm">
              Numéro : <span className="font-bold">{placed.number}</span>
            </div>
            <button onClick={() => setFbOpen(true)} className="btn-harissa w-full mt-6 inline-flex items-center justify-center gap-2" data-testid="leave-feedback">
              <Star className="w-4 h-4" /> {L.leave_fb}
            </button>
            <button onClick={() => setPlaced(null)} className="btn-ghost w-full mt-2">{L.new_order}</button>
          </div>
        </div>
      )}

      {/* feedback modal */}
      {fbOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8" data-testid="feedback-modal">
            {fbSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div className="mt-4 font-display font-black text-xl">{L.fb_thanks}</div>
              </div>
            ) : (
              <>
                <div className="font-display font-black text-xl text-center">{L.rate}</div>
                <div className="flex justify-center gap-1 mt-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setFbRating(n)} data-testid={`fb-star-${n}`}>
                      <Star className={`w-9 h-9 ${n <= fbRating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                    </button>
                  ))}
                </div>
                <input
                  className="mt-5 w-full px-3 py-2.5 rounded-lg border border-rx"
                  placeholder={L.fb_name}
                  value={fbName}
                  onChange={(e) => setFbName(e.target.value)}
                  data-testid="fb-name"
                />
                <textarea
                  rows={3}
                  className="mt-3 w-full px-3 py-2.5 rounded-lg border border-rx"
                  placeholder={L.fb_comment}
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                  data-testid="fb-comment"
                />
                <button disabled={fbRating < 1} onClick={sendFeedback} className="btn-harissa w-full mt-4 disabled:opacity-50" data-testid="fb-send">
                  {L.send}
                </button>
                <button onClick={() => { setFbOpen(false); setPlaced(null); }} className="btn-ghost w-full mt-2">{L.new_order}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
