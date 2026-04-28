import { createContext, useContext, useEffect, useState } from "react";

const I18nCtx = createContext(null);

const DICT = {
  fr: {
    // nav
    dashboard: "Tableau de bord",
    orders: "Commandes",
    kitchen: "Cuisine",
    menu: "Menu",
    tables: "Tables & QR",
    analytics: "Analytiques",
    stock: "Stock",
    feedback: "Avis clients",
    staff: "Équipe",
    settings: "Paramètres",
    logout: "Déconnexion",
    // landing
    get_started: "Commencer",
    login: "Connexion",
    register: "S'inscrire",
    // dashboard
    revenue: "Chiffre d'affaires",
    orders_today: "Commandes du jour",
    avg_ticket: "Ticket moyen",
    active_tables: "Tables actives",
    best_sellers: "Meilleures ventes",
    active_orders: "Commandes actives",
    hourly_revenue: "Revenus par heure",
    vs_yesterday: "vs hier",
    // kitchen
    all: "Tout",
    pending: "En attente",
    preparing: "En cours",
    ready: "Prêt",
    served: "Servi",
    start: "Commencer",
    mark_ready: "Marquer prêt",
    mark_served: "Marquer servi",
    cancel: "Annuler",
    // misc
    save: "Enregistrer",
    delete: "Supprimer",
    edit: "Modifier",
    add: "Ajouter",
    close: "Fermer",
    loading: "Chargement…",
    empty: "Aucun résultat",
    dine_in: "Sur place",
    takeaway: "À emporter",
    table: "Table",
    total: "Total",
    quantity: "Quantité",
    order_placed: "Commande envoyée",
    my_cart: "Mon panier",
    place_order: "Envoyer la commande",
    description: "Description",
    price: "Prix",
    category: "Catégorie",
    name: "Nom",
    available: "Disponible",
  },
  ar: {
    dashboard: "لوحة التحكم",
    orders: "الطلبات",
    kitchen: "المطبخ",
    menu: "القائمة",
    tables: "الطاولات و QR",
    analytics: "التحليلات",
    stock: "المخزون",
    feedback: "آراء الزبائن",
    staff: "الفريق",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    get_started: "ابدأ الآن",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    revenue: "رقم المعاملات",
    orders_today: "طلبات اليوم",
    avg_ticket: "متوسط الفاتورة",
    active_tables: "الطاولات النشطة",
    best_sellers: "الأكثر مبيعاً",
    active_orders: "الطلبات النشطة",
    hourly_revenue: "الإيرادات بالساعة",
    vs_yesterday: "مقارنة بالأمس",
    all: "الكل",
    pending: "في الانتظار",
    preparing: "قيد التحضير",
    ready: "جاهز",
    served: "تم التقديم",
    start: "ابدأ",
    mark_ready: "جاهز",
    mark_served: "تم التقديم",
    cancel: "إلغاء",
    save: "حفظ",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    close: "إغلاق",
    loading: "جارٍ التحميل…",
    empty: "لا يوجد",
    dine_in: "في المطعم",
    takeaway: "للأخذ",
    table: "طاولة",
    total: "المجموع",
    quantity: "الكمية",
    order_placed: "تم إرسال الطلب",
    my_cart: "سلتي",
    place_order: "إرسال الطلب",
    description: "الوصف",
    price: "السعر",
    category: "الفئة",
    name: "الاسم",
    available: "متوفر",
  },
};

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("rx_lang") || "fr");

  useEffect(() => {
    localStorage.setItem("rx_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const t = (key) => DICT[lang]?.[key] || DICT.fr[key] || key;

  return (
    <I18nCtx.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nCtx.Provider>
  );
}

export const useI18n = () => useContext(I18nCtx);
