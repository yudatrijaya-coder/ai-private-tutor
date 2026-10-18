# Graphify — Status Validasi End-to-End

Terakhir divalidasi: 2026-10-18
Grafik: `graphify-out/graph.json` — 4.094 node, 8.646 edge, 324 komunitas
Build dari commit: `7605181` (= HEAD saat validasi)

## Hasil validasi

| Aspek | Metode | Hasil |
|---|---|---|
| Edge import (`imports`, `imports_from`, `dynamic_import`, `re_exports`) | Dicek SEMUA (bukan sampling) terhadap statement import nyata | **2.066/2.068 = 99,9%** |
| Node fungsi benar ada di kode | SEMUA 949 fungsi di `src/` | **941/949 = 99,2%** |
| `source_location` dalam rentang file | SEMUA 3.708 node | **3.708/3.708 = 100%** |
| Edge `calls` | Sampel 25 | 25/25 = 100% |
| Edge `contains` | SEMUA | 2.777/2.864 = 97,0% |
| Angka struktural (API route, cron, agen, model Prisma, fungsi quiz.ts) | Hitung ulang dari kode | **COCOK semua** |

## Sisa yang belum 100% dan PENJELASANNYA

**2 edge import** — keduanya sah, keterbatasan validator regex:
- `src/bot/agent/tutor.ts -> types` : impor tipe via `ChatMessage` dari `@/llm/client` (tipe, bukan nama modul)
- `src/rules/index.ts -> definitions` : `import "./definitions";` (side-effect import tanpa nama) — **grafik BENAR, validator tidak menangkap pola ini**

**8 node fungsi** — semuanya **method**, bukan fungsi bebas:
`.constructor`, `.debug`, `.info`, `.acquire`, `.reset`
Ini method kelas. Grafik menandainya `_callable: true`; pencarian regex `\bname\b` gagal karena `.` prefix.

## Keterbatasan grafik yang WAJIB diketahui

1. **God nodes tercampur modul standar.** `json` (121), `subprocess` (87), `time` (73), `re` (72), `os` (51) bukan abstraksi app.
   Abaikan saat analisis arsitektur. Yang valid: `prisma.ts` (243), `getActiveCurriculumId()` (62), `escapeMd()` (52), `resolveScope()` (49), `callLLM()` (48).

2. **Edge ke `package.json` = dependency, bukan import kode.** 414 edge seperti ini. Valid tapi beda semantik.

3. **File-level node** (label = nama file) punya `source_location: L1` yang tidak bermakna.

4. **Re-export dilacak ke asal simbol.** Contoh: `daily-nudge.ts -> slide-html.ts` padahal yang diimpor `escapeHtml` lewat `telegram-format.ts`. Ini benar (asal simbol) tapi membingungkan saat dibaca.

5. **102 node (2,5%) tanpa `source_file`** — tidak bisa diverifikasi ke kode (mayoritas generated Prisma).

## Cara pakai untuk deployment/debugging

```bash
cd /home/ubuntu/ai-private-tutor

# Paling andal — cari simbol
./graphify-run.sh explain "handleQuizAnswer()"

# Hubungan 2 hal
./graphify-run.sh path "getActiveCurriculumId()" "prisma.ts"

# Alur kode presisi (seed + filter edge call)
./graphify-run.sh seeded "x" --seed "handleQuizAnswer()" --context call

# Query bebas (pakai kata Inggris; alias ID->EN otomatis)
./graphify-run.sh query "alur kuis"
```

**Hindari:** `graphify query --help` (menjalankan query "help", bukan bantuan).
Lihat `graphify --help`.

## Validasi ulang setelah ada perubahan kode

```bash
./graphify-run.sh update .          # sinkronkan grafik (gratis, AST saja)
python3 tools/graphify/validate-e2e.py   # pastikan masih akurat
```

Jalankan validator setiap kali grafik di-rebuild besar, terutama setelah upgrade graphify.

## Catatan penting saat rebuild

- **JANGAN** jalankan dua `extract` bersamaan ke `graphify-out/` yang sama.
- Model 9Router `sumopod/*` sedang DIBLOKIR; pakai `codex` (default wrapper).
- Pola `.graphifyignore` WAJIB anchor `/` (mis. `/data/`), kalau tidak `src/data/` ikut terbuang.
