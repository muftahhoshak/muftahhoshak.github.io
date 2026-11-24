// صفحة الزوار: العروض + الخريطة + صفحة العقار
(function () {
  const { C, db, configured, KINDS, DEALS, STATUS, PAPERS, priceText, shortPrice, code, date, esc, toast, waLink, telLink } = window.M;
  const $ = (s) => document.querySelector(s);

  const ICON = {
    back: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#10212B" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    share: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#10212B" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    wa: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    nav: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#0B7A5E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
    photo: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6E7F78" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>'
  };

  // أمثلة تظهر بس لين يتربط الموقع بقاعدة البيانات
  const DEMO = [
    { id: 17, title: "شقة 3 غرف في الكيش", deal: "sale", kind: "apartment", city: "بنغازي", area: "الكيش", price: 450000, size_m2: 180, rooms: 3, baths: 2, floor: 2, description: "شقة مشطبة بالكامل، مطبخ راكب، مدخل خاص وموقف سيارة.", lat: 32.105, lng: 20.085, images: [], status: "available", featured: true, created_at: "2026-11-22" },
    { id: 16, title: "فيلا في الفويهات", deal: "sale", kind: "villa", city: "بنغازي", area: "الفويهات", price: 1200000, size_m2: 400, rooms: 5, baths: 4, floor: 0, description: "فيلا دورين مع حوش وحديقة.", lat: 32.085, lng: 20.06, images: [], status: "available", featured: false, created_at: "2026-11-20" },
    { id: 15, title: "شقة للإيجار في السلماني", deal: "rent", rent_period: "month", kind: "apartment", city: "بنغازي", area: "السلماني", price: 1500, size_m2: 120, rooms: 2, baths: 1, floor: 3, description: "شقة نظيفة قريبة من الخدمات.", lat: 32.11, lng: 20.1, images: [], status: "available", featured: false, created_at: "2026-11-18" }
  ];

  let all = [];
  const f = { q: "", city: "", area: "", deal: "", kind: "", sort: "new" };
  let map, markers = {}, miniMap;

  // ---------- تحميل ----------
  async function load() {
    if (!configured) { $("#demoBar").classList.remove("hidden"); all = DEMO; return; }
    const { data, error } = await db.from("listings").select("*").order("created_at", { ascending: false });
    if (error) { toast("ما قدرناش نجيبوا العروض، حاول بعد شوية"); all = []; return; }
    all = data || [];
  }

  // ---------- الفلاتر ----------
  function initFilters() {
    $("#topPhone").textContent = C.PHONE_LOCAL;
    $("#topCall").href = telLink();
    $("#fab").href = waLink("السلام عليكم، نبي نستفسر على عقار من موقع مفتاح حوشك");
    C.CITIES.forEach((c) => $("#city").insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
    const kinds = $("#kinds");
    kinds.innerHTML = `<button class="chip on" data-v="">الكل</button>` +
      Object.entries(KINDS).map(([k, v]) => `<button class="chip" data-v="${k}">${v}</button>`).join("");
    kinds.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; kinds.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b)); f.kind = b.dataset.v; setBg(f.kind); render(); };
    $("#deal").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; $("#deal").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); f.deal = b.dataset.v; render(); };
    $("#q").oninput = (e) => { f.q = e.target.value.trim(); render(); };
    $("#city").onchange = (e) => {
      f.city = e.target.value; f.area = "";
      const list = (C.AREAS && C.AREAS[f.city]) || [];
      const sel = $("#areaSel");
      // الأحياء من القائمة + أي منطقة فيها عروض ومش في القائمة
      const extra = [...new Set(all.filter((l) => l.city === f.city && l.area && !list.includes(l.area)).map((l) => l.area))];
      const opts = list.concat(extra);
      sel.innerHTML = `<option value="">كل المناطق</option>` + opts.map((a) => `<option>${esc(a)}</option>`).join("");
      sel.classList.toggle("hidden", !f.city || !opts.length);
      render();
    };
    $("#areaSel").onchange = (e) => { f.area = e.target.value; render(); };
    $("#sort").onchange = (e) => { f.sort = e.target.value; render(); };
  }

  // الخلفية تتبدل حسب نوع العقار (الشقق والكل: المدينة)
  function setBg(kind) { if (kind && kind !== "apartment") document.body.dataset.kind = kind; else delete document.body.dataset.kind; }

  function filtered() {
    const q = f.q.replace(/^0+/, "");
    let r = all.filter((l) => l.status === "available" &&
      (!f.city || l.city === f.city) && (!f.area || l.area === f.area) && (!f.deal || l.deal === f.deal) && (!f.kind || l.kind === f.kind) &&
      (!f.q || [l.title, l.area, l.city, l.description].join(" ").includes(f.q) || (q && String(l.id) === q)));
    if (f.sort === "low") r.sort((a, b) => a.price - b.price);
    else if (f.sort === "high") r.sort((a, b) => b.price - a.price);
    else r.sort((a, b) => (b.featured - a.featured) || (new Date(b.created_at) - new Date(a.created_at)));
    return r;
  }

  // ---------- القائمة ----------
  function cardHTML(l) {
    const img = l.images && l.images[0];
    return `<a class="card" href="#/p/${l.id}" id="c${l.id}">
      <div class="ph" style="${img ? `background-image:url('${esc(img)}')` : ""}">
        ${img ? "" : `<div style="height:100%;display:flex;align-items:center;justify-content:center">${ICON.photo}</div>`}
        <span class="badge ${l.deal === "rent" ? "rent" : ""}">${DEALS[l.deal]}</span>
        ${l.featured ? `<span class="badge feat">مميز</span>` : ""}
      </div>
      <div class="body">
        <h3>${esc(l.title)}</h3>
        <span class="meta">${esc(l.city)} · ${esc(l.area || "")}${l.size_m2 ? " · " + l.size_m2 + " م²" : ""}</span>
        <span class="price">${priceText(l)}</span>
        ${l.papers && PAPERS[l.papers] ? `<span class="paper ${PAPERS[l.papers].c}">${PAPERS[l.papers].s}</span>` : ""}
      </div></a>`;
  }

  function render() {
    const r = filtered();
    const cta = `<div class="reqcta"><div><b>ما لقيتش اللي تبيه؟</b><span>قولّنا شنو تدور عليه، ونتصلوا بيك أول ما يجي.</span></div><a class="btn primary" href="#/request">اطلب عقارك</a></div>`;
    $("#list").innerHTML = `<div class="count">${r.length} عرض</div>` +
      (r.length ? r.map(cardHTML).join("") + cta : `<div class="empty">ما فيش عروض بالبحث هذا. جرّب تغيّر الفلاتر.</div>` + cta);
    drawPins(r);
  }

  // ---------- الخريطة ----------
  function tiles(m) {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    m.attributionControl.setPrefix(false);
  }
  function pinIcon(l, on) {
    return L.divIcon({ className: "", html: `<span class="pin ${on ? "on" : ""}">${l.deal === "rent" ? shortPrice(l.price) + "/ش" : shortPrice(l.price)}</span>`, iconSize: [0, 0] });
  }
  function initMap() {
    if (!window.L) { document.querySelector(".mapbox").classList.add("hidden"); return; }
    map = L.map("map", { zoomControl: true }).setView(C.MAP_CENTER, C.MAP_ZOOM);
    tiles(map);
  }
  function drawPins(r) {
    if (!map) return;
    Object.values(markers).forEach((m) => m.remove()); markers = {};
    const pts = [];
    r.filter((l) => l.lat && l.lng).forEach((l) => {
      const m = L.marker([l.lat, l.lng], { icon: pinIcon(l, false) }).addTo(map);
      m.on("click", () => {
        Object.entries(markers).forEach(([id, mk]) => mk.setIcon(pinIcon(all.find((x) => x.id == id), id == l.id)));
        const c = document.getElementById("c" + l.id);
        if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.style.boxShadow = "0 0 0 3px #0B7A5E"; setTimeout(() => (c.style.boxShadow = ""), 1600); }
      });
      markers[l.id] = m; pts.push([l.lat, l.lng]);
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    else if (pts.length === 1) map.setView(pts[0], 15);
  }

  // ---------- صفحة العقار ----------
  function showDetail(id) {
    const l = all.find((x) => String(x.id) === String(id));
    const el = $("#detail");
    if (!l) { el.innerHTML = `<div class="wrap" style="padding:40px 16px"><div class="empty">العرض هذا مش موجود أو انشال. <a href="#/" style="color:#0B6A52;font-weight:600">ارجع للعروض</a></div></div>`; return; }
    document.title = l.title + " | مفتاح حوشك";
    const imgs = l.images || [];
    const closed = l.status !== "available";
    const msg = `السلام عليكم، نبي نستفسر على العرض رقم ${code(l)}: ${l.title}\n${location.href}`;
    el.innerHTML = `
      <div class="detail">
        <div class="gallery">
          ${imgs.length ? `<div class="slides" id="slides">${imgs.map((u, i) => `<img src="${esc(u)}" alt="صورة ${i + 1} - ${esc(l.title)}" loading="${i ? "lazy" : "eager"}">`).join("")}</div>`
            : `<div style="height:100%;display:flex;align-items:center;justify-content:center">${ICON.photo}</div>`}
          <div class="gal-top">
            <a href="#/" class="round" aria-label="رجوع">${ICON.back}</a>
            <button class="round" id="shareBtn" aria-label="مشاركة">${ICON.share}</button>
          </div>
          ${imgs.length > 1 ? `<span class="counter" id="counter">1 / ${imgs.length}</span>` : ""}
        </div>
        <div class="sheet">
          ${closed ? `<div class="msg err">العقار هذا ${STATUS[l.status]}. شوف <a href="#/" style="font-weight:600">العروض المتاحة</a>.</div>` : ""}
          <div class="titlerow">
            <div>
              <span class="tag">${DEALS[l.deal]} · ${KINDS[l.kind] || ""}</span>
              <h1>${esc(l.title)}</h1>
              <span class="meta" style="color:#5B6B73;font-size:14px">${esc(l.city)} · ${esc(l.area || "")}</span>
            </div>
            <div style="text-align:left;flex-shrink:0"><div class="price" style="font-size:22px">${priceText(l).replace(" د.ل", "")}</div><div style="font-size:12px;color:#5B6B73">دينار ليبي</div></div>
          </div>
          <div class="specs">
            ${spec(l.rooms, "غرف")}${spec(l.baths, "حمام")}${spec(l.size_m2, "م²")}${spec(l.floor === 0 ? "أرضي" : l.floor, "الدور")}
          </div>
          ${l.papers && PAPERS[l.papers] ? `<div class="paperbox"><span class="paper ${PAPERS[l.papers].c}" style="font-size:12px">${PAPERS[l.papers].s}</span><div><b>أوراق العقار: ${PAPERS[l.papers].t}</b><span>اسأل على التفاصيل والمستندات لما تتصل بينا.</span></div></div>` : ""}
          ${l.description ? `<p class="desc">${esc(l.description)}</p>` : ""}
          ${l.lat && l.lng ? `<h2 style="margin:0;font-size:17px">الموقع</h2><div class="minimap" id="minimap"></div>
          <div class="row"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}">${ICON.nav} الاتجاهات</a>
          <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}">خرائط جوجل</a></div>` : ""}
          <div class="owner">
            <span class="brand"><span class="mark"><img src="mark.svg" alt=""></span></span>
            <div style="flex:1"><b style="font-family:Cairo,sans-serif">مفتاح حوشك</b><div style="font-size:12px;color:#5B6B73">نُشر بتاريخ ${date(l.created_at)} · رقم العرض ${code(l)}</div></div>
            <span class="tag" style="${closed ? "background:#EEF1F0;color:#5B6B73" : ""}">${STATUS[l.status]}</span>
          </div>
        </div>
      </div>
      <div class="contact"><div class="wrap">
        <a class="btn dark" href="${telLink()}">${ICON.phone} اتصال</a>
        <a class="btn wa" target="_blank" rel="noopener" href="${waLink(msg)}">${ICON.wa} واتساب</a>
      </div></div>`;
    const s = $("#slides");
    if (s && $("#counter")) s.addEventListener("scroll", () => { $("#counter").textContent = Math.round(Math.abs(s.scrollLeft) / s.clientWidth) + 1 + " / " + imgs.length; });
    $("#shareBtn").onclick = async () => {
      const data = { title: l.title, text: l.title + " - " + priceText(l), url: location.href };
      try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); toast("تم نسخ الرابط"); } } catch (e) {}
    };
    if (l.lat && l.lng && window.L) {
      if (miniMap) miniMap.remove();
      miniMap = L.map("minimap", { scrollWheelZoom: false, dragging: !L.Browser.mobile }).setView([l.lat, l.lng], 15);
      tiles(miniMap);
      L.marker([l.lat, l.lng], { icon: pinIcon(l, true) }).addTo(miniMap);
    }
  }
  function spec(v, t) { return `<div class="spec"><b>${v == null || v === "" ? "—" : esc(v)}</b><span>${t}</span></div>`; }

  // ---------- اطلب عقارك ----------
  function initRequest() {
    C.CITIES.forEach((c) => $("#rCity").insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
    Object.entries(KINDS).forEach(([k, v]) => $("#rKind").insertAdjacentHTML("beforeend", `<option value="${k}">${v}</option>`));
    const fill = () => { $("#rAreaList").innerHTML = ((C.AREAS && C.AREAS[$("#rCity").value]) || []).map((a) => `<option value="${esc(a)}"></option>`).join(""); };
    $("#rCity").onchange = fill; fill();
    $("#reqForm").onsubmit = async (e) => {
      e.preventDefault();
      const phone = $("#rPhone").value.replace(/\D/g, "").replace(/^218/, "0").replace(/^9/, "09");
      const budget = $("#rBudget").value.replace(/[^\d]/g, "");
      const errs = [];
      if ($("#rName").value.trim().length < 2) errs.push("اسمك");
      if (!/^09[0-9]{8}$/.test(phone)) errs.push("رقم الموبايل (10 أرقام يبدا بـ 09)");
      if (errs.length) { $("#rMsg").innerHTML = `<div class="msg err">ناقص أو غلط: ${errs.join("، ")}</div>`; return; }
      if (!configured) { $("#rMsg").innerHTML = `<div class="msg ok">وضع تجريبي: الطلب ما تبعتش.</div>`; return; }
      $("#rSend").disabled = true; $("#rSend").textContent = "قاعد يبعت…";
      const { error } = await db.from("requests").insert({
        name: $("#rName").value.trim(), phone, deal: $("#rDeal").value, kind: $("#rKind").value, city: $("#rCity").value,
        area: $("#rArea").value.trim() || null, budget: budget ? Number(budget) : null, notes: $("#rNotes").value.trim() || null
      });
      $("#rSend").disabled = false; $("#rSend").textContent = "ابعت الطلب";
      if (error) { $("#rMsg").innerHTML = `<div class="msg err">ما تبعتش الطلب. تأكد من الإنترنت وحاول مرة ثانية، أو كلّمنا واتساب.</div>`; return; }
      $("#reqForm").reset(); fill();
      $("#rMsg").innerHTML = `<div class="msg ok">وصلنا طلبك ✅ أول ما يجينا عقار يناسبك نتصلوا بيك.</div>`;
    };
  }

  // ---------- التنقل ----------
  function route() {
    const m = location.hash.match(/^#\/p\/(\d+)/);
    const onDetail = !!m, onReq = location.hash === "#/request";
    $("#home").classList.toggle("hidden", onDetail || onReq);
    $("#detail").classList.toggle("hidden", !onDetail);
    $("#request").classList.toggle("hidden", !onReq);
    $("#fab").classList.toggle("hidden", onDetail);
    if (onReq) { setBg(""); $("#rMsg").innerHTML = ""; window.scrollTo(0, 0); document.title = "اطلب عقارك | مفتاح حوشك"; return; }
    if (onDetail) { const l = all.find((x) => String(x.id) === m[1]); setBg(l && l.kind); showDetail(m[1]); window.scrollTo(0, 0); }
    else { setBg(f.kind); document.title = "مفتاح حوشك | عقارات للبيع والإيجار في ليبيا"; if (map) setTimeout(() => map.invalidateSize(), 50); }
  }

  (async function start() {
    initFilters(); initMap(); initRequest();
    await load();
    render(); route();
    window.addEventListener("hashchange", route);
    // منع حفظ الصور بالضغط المطوّل أو الزر اليمين
    document.addEventListener("contextmenu", (e) => { if (e.target.closest(".slides, .ph, .gallery")) e.preventDefault(); });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  })();
})();
