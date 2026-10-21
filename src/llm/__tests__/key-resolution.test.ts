/**
 * Tes perilaku resolusi API key setelah fallback hardcode dihapus.
 * Jalankan dengan berbagai variasi env (lihat run-key-tests.sh).
 */
import { callLLM } from "../client";

async function main() {
  console.log(`\nLLM_API_KEY      = ${process.env.LLM_API_KEY ? "(ada)" : "(kosong)"}`);
  console.log(`LLM_ALLOW_NO_KEY = ${process.env.LLM_ALLOW_NO_KEY ?? "(tidak diset)"}`);
  console.log("");

  try {
    const out = await callLLM(
      "assessment",
      [{ role: "user", content: "Balas satu kata: OK" }],
      { studentId: "test-key-resolution", maxTokens: 16 },
    );
    console.log(`HASIL: SUKSES → ${JSON.stringify(String(out).slice(0, 40))}`);
    process.exit(0);
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    const isOurError = msg.includes("LLM_API_KEY tidak diset");
    console.log(`HASIL: GAGAL`);
    console.log(`  jenis    : ${isOurError ? "PESAN JELAS DARI KITA ✓" : "error lain"}`);
    console.log(`  pesan    : ${msg.split("\n")[0].slice(0, 100)}`);
    // Sukses-kriteria: kalau tanpa key, harus muncul pesan jelas, BUKAN 401 samar
    // Hanya periksa apakah error BERASAL dari 9Router (bukan sekadar kata
    // "401" di teks bantuan kita sendiri).
    const fromRouter = /Invalid API key|authentication_error/.test(msg);
    console.log(`  berasal dari 9Router: ${fromRouter ? "YA (masih samar) ✗" : "tidak ✓"}`);
    process.exit(isOurError ? 0 : 1);
  }
}

main();
