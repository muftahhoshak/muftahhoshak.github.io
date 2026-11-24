// لوحة الإدارة: دخول، إضافة وتعديل العروض، الصور، الخريطة
(function () {
  const { C, db, configured, KINDS, DEALS, STATUS, priceText, code, esc, toast } = window.M;
  const $ = (s) => document.querySelector(s);
  const show = (id) => ["#loginBox", "#listBox", "#formBox"].forEach((x) => $(x).classList.toggle("hidden", x !== id));

  let rows = [], editing = null, photos = [], pick, pickMarker;
  // photos: [{url}] صور مرفوعة، أو [{file, preview}] صور جديدة

  if (!configured) { $("#notConfigured").classList.remove("hidden"); return; }

  // ---------- الدخول ----------
  $("#loginBox").onsubmit = async (e) => {
    e.preventDefault();
    $("#loginMsg").innerHTML = "";
    const { error } = await db.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#pass").value });
    if (error) $("#loginMsg").innerHTML = `<div class="msg err">الإيميل أو كلمة السر غلط.</div>`;
    else boot();
  };
  $("#logout").onclick = async () => { await db.auth.signOut(); location.reload(); };

  async function boot() {
    const { data } = await db.auth.getSession();
    if (!data.session) { show("#loginBox"); return; }
    $("#logout").classList.remove("hidden");
    await loadRows(); show("#listBox");
  }

  // ---------- القائمة ----------
  async function loadRows() {
    const { data, error } = await db.from("listings").select("*").order("id", { ascending: false });
    if (error) { toast("خطأ في تحميل العروض"); return; }
    rows = data || [];
    const av = rows.filter((r) => r.status === "available").length;
    $("#stats").textContent = `(${av} متاح من ${rows.length})`;
    $("#rows").innerHTML = rows.map((r) => `<tr>
      <td>${code(r)}</td>
      <td><a href="index.html#/p/${r.id}" target="_blank" style="font-weight:600">${esc(r.title)}</a><div style="font-size:12px;color:#5B6B73">${DEALS[r.deal]} · ${esc(r.city)} · ${esc(r.area || "")}</div></td>
      <td style="white-space:nowrap">${priceText(r)}</td>
      <td><select class="mini" data-st="${r.id}" style="border:1px solid #DDE3E0;border-radius:10px">
        ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
      <td style="white-space:nowrap"><button class="btn mini" data-ed="${r.id}">تعديل</button> <button class="btn mini danger" data-del="${r.id}">حذف</button></td>
    </tr>`).join("") || `<tr><td colspan="5" style="text-align:center;color:#5B6B73;padding:24px">ما فيش عروض لين توا. اضغط "إضافة عرض جديد".</td></tr>`;
  }

  $("#rows").onchange = async (e) => {
    const id = e.target.dataset.st; if (!id) return;
    const { error } = await db.from("listings").update({ status: e.target.value }).eq("id", id);
    toast(error ? "ما تحفظتش الحالة" : "تحدّثت الحالة"); loadRows();
  };
  $("#rows").onclick = async (e) => {
    const ed = e.target.dataset.ed, del = e.target.dataset.del;
    if (ed) openForm(rows.find((r) => r.id == ed));
    if (del) {
      const r = rows.find((x) => x.id == del);
      if (!confirm(`متأكد تبي تحذف العرض "${r.title}" نهائياً؟\nلو العقار تباع، الأفضل تغيّر حالته لـ"مُباع" بدل الحذف.`)) return;
      await removeFiles(r.images || []);
      const { error } = await db.from("listings").delete().eq("id", del);
      toast(error ? "ما انحذفش" : "انحذف العرض"); loadRows();
    }
  };
  $("#newBtn").onclick = () => openForm(null);
  $("#cancelBtn").onclick = () => show("#listBox");

  // ---------- النموذج ----------
  C.CITIES.forEach((c) => $("#city").insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
  Object.entries(KINDS).forEach(([k, v]) => $("#kind").insertAdjacentHTML("beforeend", `<option value="${k}">${v}</option>`));
  $("#deal").onchange = () => $("#periodBox").classList.toggle("hidden", $("#deal").value !== "rent");
  const FIELDS = ["title", "deal", "kind", "city", "area", "price", "rent_period", "size_m2", "rooms", "baths", "floor", "description"];

  function openForm(r) {
    editing = r;
    $("#formTitle").textContent = r ? `تعديل العرض ${code(r)}` : "إضافة عرض جديد";
    $("#saveBtn").textContent = r ? "حفظ التعديلات" : "نشر العرض";
    FIELDS.forEach((k) => ($("#" + k).value = r && r[k] != null ? r[k] : ""));
    if (!r) { $("#deal").value = "sale"; $("#kind").value = "apartment"; $("#city").value = C.CITIES[0]; $("#rent_period").value = "month"; }
    $("#featured").checked = !!(r && r.featured);
    $("#deal").onchange();
    photos = (r && r.images ? r.images : []).map((url) => ({ url }));
    drawThumbs();
    $("#formMsg").innerHTML = "";
    show("#formBox"); window.scrollTo(0, 0);
    initPick(r && r.lat ? [r.lat, r.lng] : null);
  }

  // الصور
  function drawThumbs() {
    $("#thumbs").innerHTML = photos.map((p, i) => `<div class="thumb" style="background-image:url('${esc(p.url || p.preview)}')">
      <button type="button" data-rm="${i}" aria-label="شيل الصورة">×</button>${i === 0 ? `<span class="first">الرئيسية</span>` : ""}</div>`).join("") +
      `<button type="button" class="addph" id="addPh"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B7A5E" stroke-width="2" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>أضف صور</button>`;
    $("#addPh").onclick = () => $("#files").click();
  }
  $("#thumbs").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i != null) { photos.splice(+i, 1); drawThumbs(); } });
  $("#files").onchange = async (e) => {
    for (const file of e.target.files) {
      const blob = await shrink(file);
      photos.push({ file: blob, preview: URL.createObjectURL(blob) });
    }
    e.target.value = ""; drawThumbs();
  };
  function shrink(file, max = 1600) {
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob((b) => ok(b), "image/jpeg", 0.82);
      };
      img.src = URL.createObjectURL(file);
    });
  }
  async function upload() {
    const out = [];
    for (const p of photos) {
      if (p.url) { out.push(p.url); continue; }
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await db.storage.from("photos").upload(path, p.file, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw new Error("upload");
      out.push(db.storage.from("photos").getPublicUrl(path).data.publicUrl);
    }
    return out;
  }
  async function removeFiles(urls) {
    const paths = urls.map((u) => u.split("/photos/")[1]).filter(Boolean);
    if (paths.length) await db.storage.from("photos").remove(paths);
  }

  // الخريطة
  function initPick(pos) {
    if (!pick) {
      pick = L.map("pickmap").setView(C.MAP_CENTER, C.MAP_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(pick);
      pick.on("click", (e) => setPin(e.latlng));
    }
    if (pickMarker) { pickMarker.remove(); pickMarker = null; }
    if (pos) { setPin({ lat: pos[0], lng: pos[1] }); pick.setView(pos, 16); } else pick.setView(C.MAP_CENTER, C.MAP_ZOOM);
    setTimeout(() => pick.invalidateSize(), 60);
  }
  function setPin(ll) {
    if (!pickMarker) pickMarker = L.marker(ll, { draggable: true }).addTo(pick);
    else pickMarker.setLatLng(ll);
  }
  $("#myLoc").onclick = () => {
    if (!navigator.geolocation) return toast("الموبايل ما يدعمش تحديد الموقع");
    navigator.geolocation.getCurrentPosition((p) => { const ll = { lat: p.coords.latitude, lng: p.coords.longitude }; setPin(ll); pick.setView(ll, 17); },
      () => toast("ما قدرناش نحددوا موقعك، فعّل الموقع (GPS)"), { enableHighAccuracy: true, timeout: 10000 });
  };

  // الحفظ مع التحقق من البيانات
  $("#formBox").onsubmit = async (e) => {
    e.preventDefault();
    const num = (id) => { const v = $("#" + id).value.trim().replace(/,/g, ""); return v === "" ? null : Number(v); };
    const errs = [];
    if (!photos.length) errs.push("صورة وحدة على الأقل");
    if ($("#title").value.trim().length < 5) errs.push("عنوان العرض");
    if (!$("#area").value.trim()) errs.push("المنطقة");
    const price = num("price"); if (!price || price <= 0 || isNaN(price)) errs.push("السعر (رقم صحيح)");
    const size = num("size_m2"); if (!size || size <= 0 || isNaN(size)) errs.push("المساحة");
    ["rooms", "baths", "floor"].forEach((k) => { const v = num(k); if (v != null && (isNaN(v) || v < 0)) errs.push({ rooms: "الغرف", baths: "الحمامات", floor: "الدور" }[k]); });
    if (!pickMarker) errs.push("مكان العقار على الخريطة");
    if (errs.length) { $("#formMsg").innerHTML = `<div class="msg err">ناقص أو غلط: ${errs.join("، ")}</div>`; return; }

    $("#saveBtn").disabled = true; $("#saveBtn").textContent = "قاعد يحفظ…";
    try {
      const ll = pickMarker.getLatLng();
      const rec = {
        title: $("#title").value.trim(), deal: $("#deal").value, kind: $("#kind").value, city: $("#city").value,
        area: $("#area").value.trim(), price, rent_period: $("#deal").value === "rent" ? $("#rent_period").value : null,
        size_m2: size, rooms: num("rooms"), baths: num("baths"), floor: num("floor"),
        description: $("#description").value.trim(), featured: $("#featured").checked,
        lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6), images: await upload()
      };
      if (editing) {
        const gone = (editing.images || []).filter((u) => !rec.images.includes(u));
        const { error } = await db.from("listings").update(rec).eq("id", editing.id);
        if (error) throw error;
        await removeFiles(gone);
      } else {
        const { error } = await db.from("listings").insert({ ...rec, status: "available" });
        if (error) throw error;
      }
      toast(editing ? "تحفظت التعديلات" : "تنشر العرض");
      await loadRows(); show("#listBox");
    } catch (err) {
      $("#formMsg").innerHTML = `<div class="msg err">ما تحفظش العرض. تأكد من الإنترنت وحاول مرة ثانية.</div>`;
    } finally {
      $("#saveBtn").disabled = false; $("#saveBtn").textContent = editing ? "حفظ التعديلات" : "نشر العرض";
    }
  };

  boot();
})();
