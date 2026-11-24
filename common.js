// أدوات مشتركة بين صفحة الزوار وصفحة الإدارة
(function () {
  const C = window.MUFTAH;
  const configured = C.SUPABASE_URL.startsWith("http") && !C.SUPABASE_ANON_KEY.startsWith("PUT_");
  const db = configured ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  const KINDS = { apartment: "شقة", house: "بيت", villa: "فيلا", land: "أرض", shop: "محل", office: "مكتب", farm: "مزرعة" };
  const DEALS = { sale: "للبيع", rent: "للإيجار" };
  const PAPERS = {
    registered: { t: "مسجّل في السجل العقاري", s: "أوراق مسجّلة", c: "ok" },
    pending: { t: "قيد التسجيل", s: "قيد التسجيل", c: "wait" },
    customary: { t: "عقد عرفي", s: "عقد عرفي", c: "note" }
  };
  const STATUS = { available: "متاح", sold: "مُباع", rented: "مؤجَّر" };

  const nf = new Intl.NumberFormat("en-US");
  function money(v) { return v == null || v === "" ? "—" : nf.format(Number(v)); }
  function priceText(l) {
    const p = money(l.price) + " د.ل";
    return l.deal === "rent" ? p + " / " + (l.rent_period === "year" ? "سنة" : "شهر") : p;
  }
  function shortPrice(v) {
    v = Number(v || 0);
    if (v >= 1e6) return (Math.round(v / 1e5) / 10) + " مليون";
    if (v >= 1000) return Math.round(v / 1000) + " ألف";
    return nf.format(v);
  }
  function code(l) { return String(l.id).padStart(4, "0"); }
  function date(d) {
    const x = new Date(d);
    return String(x.getDate()).padStart(2, "0") + "/" + String(x.getMonth() + 1).padStart(2, "0") + "/" + x.getFullYear();
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function toast(t) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function waLink(text) {
    return "https://wa.me/" + C.PHONE_INTL + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function telLink() { return "tel:+" + C.PHONE_INTL; }

  window.M = { C, db, configured, KINDS, DEALS, STATUS, PAPERS, money, priceText, shortPrice, code, date, esc, toast, waLink, telLink };
})();
