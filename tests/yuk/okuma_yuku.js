// Inventory okuma yük testi (k6). SADECE GET isteği atar; stok/ürün verisi yazmaz veya silmez.
// Yalnızca yerel/test ortamında çalıştırın, production'da ASLA.
//
// Çalıştırma (Windows PowerShell, Inventory proje klasöründe; önce Inventory'yi açın, diğer projeleri durdurun):
//   $env:INV_PAROLA = "<admin demo parolası>"
//   Get-Content tests\yuk\okuma_yuku.js | docker run --rm -i -e INV_PAROLA -e INV_URL=http://host.docker.internal:8083 grafana/k6 run -
// Linux/macOS (bash):
//   docker run --rm -i -e INV_PAROLA -e INV_URL=http://host.docker.internal:8083 grafana/k6 run - < tests/yuk/okuma_yuku.js
// (k6 kuruluysa:  k6 run -e INV_PAROLA=... tests/yuk/okuma_yuku.js)
// Sonuçta bakılacaklar: http_req_duration p(95), http_req_failed, thresholds satırlarındaki ✓/✗.
import http from "k6/http";
import { check, sleep } from "k6";

const URL = __ENV.INV_URL || "http://localhost:8083";
const KULLANICI = __ENV.INV_KULLANICI || "admin";
const PAROLA = __ENV.INV_PAROLA;

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // ısınma
    { duration: "2m", target: 25 }, // eşzamanlı 25 kullanıcı
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"], // hata < %1
    http_req_duration: ["p(95)<500"], // p95 < 500 ms
  },
};

const UCLAR = [
  "/api/products",
  "/api/products/active",
  "/api/products/low-stock",
  "/api/suppliers",
  "/api/stock/movements?page=0&size=25",
  "/api/stock/report",
];

// Giriş sınırı olduğu için TEK kez giriş yapılır, jeton herkesle paylaşılır.
export function setup() {
  if (!PAROLA) throw new Error("INV_PAROLA ortam değişkeni verilmedi");
  const r = http.post(
    `${URL}/api/auth/login`,
    JSON.stringify({ username: KULLANICI, password: PAROLA }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (r.status !== 200) throw new Error(`Giriş başarısız: ${r.status}`);
  const c = r.cookies["access_token"];
  if (!c || !c[0]) throw new Error("access_token çerezi dönmedi");
  return { token: c[0].value };
}

export default function (veri) {
  const basliklar = { headers: { Authorization: `Bearer ${veri.token}` } };
  for (const uc of UCLAR) {
    const r = http.get(`${URL}${uc}`, basliklar);
    check(r, { [`${uc} 200`]: (x) => x.status === 200 });
    sleep(0.5);
  }
}
