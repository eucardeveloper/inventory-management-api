// Inventory yazma + yarış + yetki yük testi (k6). VERİ YAZAR: yalnızca yerel/demo ortamda, production'da ASLA.
// Önce .\backup.bat ile yedek alın; test sonrası .\restore.bat ile temiz yedeğe dönün.
//
// Neyi sınar?
//  1) YARIŞ: 50 birim stoklu ürüne 120 eşzamanlı "1 adet ÇIKIŞ" -> tam 50'si başarılı (201), 70'i 409; stok asla eksiye düşmez.
//  2) İDEMPOTENTLİK: aynı idempotencyKey ile 8'er eşzamanlı istek (10 anahtar) -> defterde tam 10 hareket; anahtar farklı
//     içerikle yeniden kullanılırsa 422.
//  3) TERS KAYIT: aynı hareketi 8 kişi aynı anda ters çevirirse yalnızca biri başarılı (201), diğerleri 409.
//  4) YETKİ: STAFF ürün oluşturamaz/silemez/ters kayıt atamaz, denetim ve kullanıcı listesini göremez (403);
//     tokensız istek 401; STAFF'ın gördüğü hiçbir yanıtta maliyet (totalCost, inventoryValue, birim maliyet) olmaz.
//  5) Tutarlılık: test sonunda stok = girişler - çıkışlar (defterden yeniden hesap).
//
// Çalıştırma (PowerShell, Inventory klasöründe; Inventory açık, diğer projeler kapalı):
//   $env:INV_PAROLA_ADMIN="admin123"; $env:INV_PAROLA_MANAGER="manager123"; $env:INV_PAROLA_STAFF="staff123"
//   Get-Content tests\yuk\yazma_yuku.js | docker run --rm -i --network inventory-project_default -e INV_PAROLA_ADMIN -e INV_PAROLA_MANAGER -e INV_PAROLA_STAFF -e INV_URL=http://inventory-backend:8083 -e YUKTEST_ONAY=EVET grafana/k6 run -
//
// Sonuçta bakılacaklar: akis_hata, yaris_ihlal, yetki_deligi, maliyet_sizinti, tutarlilik_ihlal hepsi 0 olmalı.
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const URL = __ENV.INV_URL || "http://localhost:8083";
const AYNI_ANDA = 120; // yarış denemesi sayısı
const BASLANGIC_STOK = 50;
const ANAHTAR_SAYISI = 10;
const ANAHTAR_TEKRAR = 8;
const TERS_SAYISI = 5;
const TERS_TEKRAR = 8;

const akis_hata = new Counter("akis_hata"); // beklenmeyen durum kodu
const yaris_ihlal = new Counter("yaris_ihlal"); // stok/idempotentlik/ters kayıt kuralı bozuldu
const yetki_deligi = new Counter("yetki_deligi"); // yetkisiz rol işlem yapabildi
const maliyet_sizinti = new Counter("maliyet_sizinti"); // STAFF maliyet verisi gördü
const tutarlilik_ihlal = new Counter("tutarlilik_ihlal"); // test sonu stok != defter toplamı

http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 403, 404, 409, 422));

export const options = {
  scenarios: {
    yaris: { executor: "shared-iterations", vus: 40, iterations: AYNI_ANDA, exec: "yarisSenaryosu", maxDuration: "2m" },
    idempotent: {
      executor: "shared-iterations", vus: 20, iterations: ANAHTAR_SAYISI * ANAHTAR_TEKRAR,
      exec: "idempotentSenaryosu", maxDuration: "2m",
    },
    ters: {
      executor: "shared-iterations", vus: 20, iterations: TERS_SAYISI * TERS_TEKRAR,
      exec: "tersSenaryosu", maxDuration: "2m",
    },
    yetki: { executor: "constant-vus", vus: 10, duration: "1m", exec: "yetkiSenaryosu" },
    okuyucu: { executor: "constant-vus", vus: 10, duration: "1m", exec: "okuyucuSenaryosu" },
  },
  thresholds: {
    akis_hata: ["count==0"],
    yaris_ihlal: ["count==0"],
    yetki_deligi: ["count==0"],
    maliyet_sizinti: ["count==0"],
    tutarlilik_ihlal: ["count==0"],
    "http_req_failed": ["rate<0.01"],
    "http_req_duration{islem:okuma}": ["p(95)<500"],
    "http_req_duration{islem:yazma}": ["p(95)<1500"],
  },
};

function giris(kullanici, parola) {
  if (!parola) throw new Error(`${kullanici} için parola verilmedi`);
  const r = http.post(`${URL}/api/auth/login`, JSON.stringify({ username: kullanici, password: parola }),
    // Ayrı çerez kutusu: k6 yanıttaki access_token çerezini kendiliğinden sonraki isteklere ekler ve çerez,
    // Authorization başlığından önce okunur. Kutuyu paylaşırsak son giriş yapan rol (staff) herkesin yerine geçer.
    { headers: { "Content-Type": "application/json" }, jar: new http.CookieJar() });
  if (r.status !== 200) throw new Error(`${kullanici} girişi başarısız: ${r.status}`);
  const c = r.cookies["access_token"];
  if (!c || !c[0]) throw new Error("access_token çerezi dönmedi");
  return c[0].value;
}

function baslik(token) {
  return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

function urunOlustur(token, ad) {
  const r = http.post(`${URL}/api/products`, JSON.stringify({ name: ad, unitPrice: 10, reorderLevel: 1, active: true }), baslik(token));
  if (r.status !== 201 && r.status !== 200) throw new Error(`ürün oluşturulamadı (${ad}): ${r.status} ${r.body}`);
  return r.json("id");
}

function hareket(token, govde, etiket) {
  return http.post(`${URL}/api/stock/movements`, JSON.stringify(govde), { ...baslik(token), tags: { islem: "yazma", name: etiket } });
}

export function setup() {
  if (__ENV.YUKTEST_ONAY !== "EVET") throw new Error("Bu test veri yazar. Onay için -e YUKTEST_ONAY=EVET verin (yalnızca demo ortamı).");
  const admin = giris("admin", __ENV.INV_PAROLA_ADMIN);
  const manager = giris("manager", __ENV.INV_PAROLA_MANAGER);
  const staff = giris("staff", __ENV.INV_PAROLA_STAFF);

  const kosu = String(Date.now());
  const a = urunOlustur(manager, `YUKTEST-${kosu}-A-yaris`);
  const b = urunOlustur(manager, `YUKTEST-${kosu}-B-idempotent`);
  const c = urunOlustur(manager, `YUKTEST-${kosu}-C-ters`);
  const d = urunOlustur(manager, `YUKTEST-${kosu}-D-staff`);

  const giris1 = (urun, adet) => {
    const r = hareket(manager, { productId: urun, quantity: adet, movementType: "IN", unitCost: 5 }, "kurulum");
    if (r.status !== 201) throw new Error(`kurulum girişi başarısız: ${r.status} ${r.body}`);
    return r.json("id");
  };
  giris1(a, BASLANGIC_STOK);
  giris1(b, 1000);
  giris1(c, BASLANGIC_STOK);
  giris1(d, 10);
  const tersIds = [];
  for (let i = 0; i < TERS_SAYISI; i++) tersIds.push(giris1(c, 10));

  return { admin, manager, staff, kosu, a, b, c, d, tersIds };
}

export function yarisSenaryosu(v) {
  const r = hareket(v.manager, { productId: v.a, quantity: 1, movementType: "OUT" }, "yaris-cikis");
  if (r.status !== 201 && r.status !== 409) akis_hata.add(1);
  if (r.status === 201 && r.json("stockAfter") < 0) yaris_ihlal.add(1);
}

export function idempotentSenaryosu(v) {
  const anahtar = `yuktest-${v.kosu}-${__ITER % ANAHTAR_SAYISI}`;
  const r = hareket(v.manager, { productId: v.b, quantity: 1, movementType: "OUT", idempotencyKey: anahtar }, "idempotent-cikis");
  if (r.status !== 201 && r.status !== 200) akis_hata.add(1);
}

export function tersSenaryosu(v) {
  const id = v.tersIds[__ITER % TERS_SAYISI];
  const r = http.post(`${URL}/api/stock/movements/${id}/reverse`, JSON.stringify({ reasonCode: "YUKTEST" }),
    { ...baslik(v.manager), tags: { islem: "yazma", name: "ters-kayit" } });
  if (r.status !== 201 && r.status !== 409) akis_hata.add(1);
}

function bekle403(r, ad) {
  if (r.status !== 403) {
    yetki_deligi.add(1);
    console.error(`YETKİ DELİĞİ: ${ad} -> ${r.status}`);
  }
}

function maliyetVarMi(nesne) {
  if (nesne === null || typeof nesne !== "object") return false;
  if (Array.isArray(nesne)) return nesne.some(maliyetVarMi);
  for (const k of Object.keys(nesne)) {
    const v = nesne[k];
    if (["totalCost", "inventoryValue", "unitCost", "lineCost"].indexOf(k) !== -1 && v !== null && v !== undefined) return true;
    if (typeof v === "object" && maliyetVarMi(v)) return true;
  }
  return false;
}

export function yetkiSenaryosu(v) {
  const s = baslik(v.staff);
  bekle403(http.post(`${URL}/api/products`, JSON.stringify({ name: "YUKTEST-yetkisiz" }), s), "STAFF ürün oluşturma");
  bekle403(http.del(`${URL}/api/products/${v.a}`, null, s), "STAFF ürün silme");
  bekle403(http.post(`${URL}/api/stock/movements/${v.tersIds[0]}/reverse`, JSON.stringify({ reasonCode: "X" }), s), "STAFF ters kayıt");
  bekle403(http.get(`${URL}/api/audit`, s), "STAFF denetim kaydı");
  bekle403(http.get(`${URL}/api/users`, s), "STAFF kullanıcı listesi");
  const t = http.get(`${URL}/api/products`);
  if (t.status !== 401) {
    yetki_deligi.add(1);
    console.error(`YETKİ DELİĞİ: tokensız ürün listesi -> ${t.status}`);
  }

  const rapor = http.get(`${URL}/api/stock/report`, { ...s, tags: { islem: "okuma" } });
  if (rapor.status !== 200) akis_hata.add(1);
  else if (maliyetVarMi(rapor.json())) maliyet_sizinti.add(1);

  const defter = http.get(`${URL}/api/stock/movements?size=50`, { ...s, tags: { islem: "okuma", name: "defter" } });
  if (defter.status !== 200) akis_hata.add(1);
  else if (maliyetVarMi(defter.json())) maliyet_sizinti.add(1);

  const gir = hareket(v.staff, { productId: v.d, quantity: 1, movementType: "IN", unitCost: 5 }, "staff-giris");
  if (gir.status !== 201) akis_hata.add(1);
  else if (maliyetVarMi(gir.json())) maliyet_sizinti.add(1);
  sleep(0.3);
}

export function okuyucuSenaryosu(v) {
  for (const uc of ["/api/products", "/api/products/low-stock", "/api/suppliers", "/api/stock/movements?page=0&size=25", "/api/stock/report"]) {
    const r = http.get(`${URL}${uc}`, { ...baslik(v.manager), tags: { islem: "okuma", name: uc } });
    check(r, { [`${uc} 200`]: (x) => x.status === 200 });
    if (r.status !== 200) akis_hata.add(1);
    sleep(0.5);
  }
}

function defterSayfasi(token, urunId) {
  const r = http.get(`${URL}/api/stock/movements?productId=${urunId}&size=200`, baslik(token));
  if (r.status !== 200) throw new Error(`defter okunamadı: ${r.status}`);
  return r.json();
}

function stok(token, urunId) {
  const r = http.get(`${URL}/api/products/${urunId}`, baslik(token));
  if (r.status !== 200) throw new Error(`ürün okunamadı: ${r.status}`);
  return r.json("stock");
}

function ihlal(sayac, mesaj) {
  sayac.add(1);
  console.error(`İHLAL: ${mesaj}`);
}

export function teardown(v) {
  // Aynı anahtar FARKLI içerikle yeniden kullanılırsa 422 beklenir (defter değişmemeli).
  const r422 = hareket(v.manager, { productId: v.b, quantity: 2, movementType: "OUT", idempotencyKey: `yuktest-${v.kosu}-0` }, "idempotent-farkli");
  if (r422.status !== 422) ihlal(yaris_ihlal, `aynı anahtar farklı içerikle -> ${r422.status} (422 beklenirdi)`);

  // A: tam BASLANGIC_STOK çıkış başarılı, stok 0.
  const sa = stok(v.manager, v.a);
  const da = defterSayfasi(v.manager, v.a);
  const cikisA = da.totalElements - 1; // ilk kayıt kurulum girişi
  if (sa !== 0) ihlal(yaris_ihlal, `A ürünü stoku ${sa} (0 beklenirdi)`);
  if (cikisA !== BASLANGIC_STOK) ihlal(yaris_ihlal, `A ürününde ${cikisA} çıkış (${BASLANGIC_STOK} beklenirdi)`);
  const topA = da.content.reduce((t, m) => t + (m.movementType === "IN" ? m.quantity : -m.quantity), 0);
  if (da.totalElements <= 200 && topA !== sa) ihlal(tutarlilik_ihlal, `A: defter toplamı ${topA} != stok ${sa}`);

  // B: her anahtar tam bir kez işlenmiş olmalı.
  const sb = stok(v.manager, v.b);
  const db = defterSayfasi(v.manager, v.b);
  if (sb !== 1000 - ANAHTAR_SAYISI) ihlal(yaris_ihlal, `B ürünü stoku ${sb} (${1000 - ANAHTAR_SAYISI} beklenirdi)`);
  if (db.totalElements !== 1 + ANAHTAR_SAYISI) ihlal(yaris_ihlal, `B defterinde ${db.totalElements} kayıt (${1 + ANAHTAR_SAYISI} beklenirdi)`);

  // C: her hareket tam bir kez ters çevrilmiş; net etki sıfır.
  const sc = stok(v.manager, v.c);
  const dc = defterSayfasi(v.manager, v.c);
  const tersSayisi = dc.content.filter((m) => m.reversalOfId !== null && m.reversalOfId !== undefined).length;
  if (tersSayisi !== TERS_SAYISI) ihlal(yaris_ihlal, `C'de ${tersSayisi} ters kayıt (${TERS_SAYISI} beklenirdi)`);
  if (sc !== BASLANGIC_STOK) ihlal(yaris_ihlal, `C ürünü stoku ${sc} (${BASLANGIC_STOK} beklenirdi)`);

  // Rapor: giriş - çıkış = mevcut stok (A ve B'de ters kayıt yok).
  const rapor = http.get(`${URL}/api/stock/report`, baslik(v.manager));
  if (rapor.status === 200) {
    for (const s of rapor.json()) {
      if (s.productId === v.a || s.productId === v.b) {
        if (s.totalIn - s.totalOut !== s.currentStock) ihlal(tutarlilik_ihlal, `rapor ${s.productName}: ${s.totalIn}-${s.totalOut} != ${s.currentStock}`);
      }
    }
  } else akis_hata.add(1);
}
