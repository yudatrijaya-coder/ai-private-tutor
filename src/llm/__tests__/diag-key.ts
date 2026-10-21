/**
 * Diagnosa: key mana yang benar-benar dipakai callLLM saat tes?
 * Tidak memanggil LLM — hanya melaporkan konfigurasi efektif.
 */
const baseURL = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
const keyEnv = process.env.LLM_API_KEY;
const apiKey = keyEnv || "sk-9router";

console.log("\n=== KONFIGURASI EFEKTIF LLM CLIENT ===\n");
console.log(`LLM_BASE_URL      : ${baseURL}`);
console.log(`LLM_API_KEY (env) : ${keyEnv ? `${keyEnv.slice(0, 8)}... (${keyEnv.length} char)` : "TIDAK ADA"}`);
console.log(`apiKey dipakai    : ${apiKey.slice(0, 8)}... (${apiKey.length} char)`);
console.log(`Sumber            : ${keyEnv ? ".env / environment" : "FALLBACK HARDCODE \"sk-9router\" ← ini penyebab 401"}`);

console.log("\n=== SIMULASI KASUS 401 ===\n");
if (!keyEnv) {
  console.log("Ketika .env tidak dimuat, client jatuh ke fallback 'sk-9router'.");
  console.log("Kalau 9Router tidak punya key itu, hasilnya: 401 Invalid API key.");
  console.log("→ Jadi 401 tadi BUKAN karena key .env salah, tapi karena .env");
  console.log("  tidak terbaca oleh proses tes.");
} else {
  console.log("Env terbaca. Key di atas seharusnya valid.");
}

// Verifikasi cepat ke endpoint (tanpa LLM call)
(async () => {
  console.log("\n=== TES KEDUA KEY KE 9ROUTER ===\n");
  for (const [label, k] of [
    ["dari env/.env", keyEnv],
    ["fallback hardcode", "sk-9router"],
  ] as const) {
    if (!k) { console.log(`  ${label}: (kosong, dilewati)`); continue; }
    try {
      const r = await fetch(`${baseURL.replace(/\/v1$/, "")}/v1/models`, {
        headers: { Authorization: `Bearer ${k}` },
      });
      console.log(`  ${label.padEnd(20)} → HTTP ${r.status} ${r.status === 200 ? "✓ VALID" : "✗ DITOLAK"}`);
    } catch (e) {
      console.log(`  ${label.padEnd(20)} → error: ${(e as Error).message}`);
    }
  }
})();
