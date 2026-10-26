/**
 * Regression test — label jenjang.
 *
 * Kenapa file ini ada
 * -------------------
 * Bug "SMP Kelas 1" / "SMA Kelas 2" sudah dua kali lolos ke produksi. Akarnya
 * bukan logika yang rumit, melainkan SALINAN: peta label `SD_5 → "SD Kelas 5"`
 * disalin ke belasan file, lalu salinannya tidak ikut diperbaiki ketika
 * `GradeLevel` berubah arti. `tsc` tidak bisa menangkapnya (semua string tetap
 * `string`), dan `grep` satu pola selalu meleset — pertama kali lolos karena
 * polanya hanya menangkap key objek, kedua kali karena `1(?!\d)` melewati
 * "SMP Kelas 1-9".
 *
 * Jadi tes ini punya dua lapis:
 *
 *   1. UNIT      — perilaku modul canonical (`gradeLabel`, `gradeShort`,
 *                  `gradeLabelWith`, `gradeOptions`), termasuk kode asing.
 *   2. ARSITEKTUR — memindai `src/` dan GAGAL bila ada kembali peta label
 *                  lokal. Ini yang benar-benar mencegah bug kambuh.
 *
 * Menjalankan:
 *   node --experimental-strip-types src/lib/__tests__/grade-label.test.ts
 *
 * (Node 22.6+ sudah punya type stripping native, jadi tidak perlu framework.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALL_GRADE_LABELS,
  ENROLLED_GRADES,
  gradeLabel,
  gradeLabelWith,
  gradeOptions,
  gradeShort,
} from "../grade-label.ts";

// ─────────────────────────────────────────────────────────────
// Lapis 1 — perilaku modul canonical
// ─────────────────────────────────────────────────────────────

test("gradeLabel memetakan enum ke kelas yang benar", () => {
  // Inti bug: nama enum BUKAN nomor kelas.
  assert.equal(gradeLabel("SD_5"), "SD Kelas 5");
  assert.equal(gradeLabel("SMP_1"), "SMP Kelas 7");
  assert.equal(gradeLabel("SMA_2"), "SMA Kelas 11");
});

test("gradeLabel tidak pernah menghasilkan kelas yang salah", () => {
  // Bentuk-bentuk lama yang pernah terkirim ke produksi.
  const forbidden = ["SMP Kelas 1", "SMA Kelas 2"];
  for (const grade of Object.keys(ALL_GRADE_LABELS)) {
    const label = gradeLabel(grade);
    for (const bad of forbidden) {
      // "SMP Kelas 11" mengandung "SMP Kelas 1", jadi bandingkan utuh.
      assert.notEqual(
        label,
        bad,
        `label untuk ${grade} masih "${bad}" — harusnya "${ALL_GRADE_LABELS[grade]}"`,
      );
    }
  }
});

test("gradeLabel mengembalikan '—' untuk nilai kosong", () => {
  assert.equal(gradeLabel(null), "—");
  assert.equal(gradeLabel(undefined), "—");
  assert.equal(gradeLabel(""), "—");
});

test("gradeLabel mengembalikan kode asing apa adanya, tidak menebak", () => {
  // Kalau suatu hari ada jenjang baru, kode mentahnya harus terlihat jelas
  // di UI alih-alih diam-diam mendapat label yang salah.
  assert.equal(gradeLabel("SD_4"), "SD_4");
  assert.equal(gradeLabel("SMP_9"), "SMP_9");
});

test("gradeShort membuang kata 'Kelas'", () => {
  assert.equal(gradeShort("SD_5"), "SD 5");
  assert.equal(gradeShort("SMP_1"), "SMP 7");
  assert.equal(gradeShort("SMA_2"), "SMA 11");
  assert.equal(gradeShort(null), "—");
});

test("gradeLabelWith menambahkan sufiks tanpa merusak label", () => {
  assert.equal(
    gradeLabelWith("SMP_1", " (Kurikulum Merdeka)"),
    "SMP Kelas 7 (Kurikulum Merdeka)",
  );
  // Kode asing tetap membawa sufiks dan tetap tidak ditebak.
  assert.equal(gradeLabelWith("XX_1", " (x)"), "XX_1 (x)");
  assert.equal(gradeLabelWith("SMA_2"), "SMA Kelas 11");
  assert.equal(gradeLabelWith(null), "—");
});

test("gradeOptions hanya menawarkan jenjang yang terdaftar", () => {
  const options = gradeOptions();
  assert.deepEqual(
    options.map((o) => o.value),
    [...ENROLLED_GRADES],
  );
  assert.deepEqual(options, [
    { value: "SD_5", label: "SD Kelas 5" },
    { value: "SMP_1", label: "SMP Kelas 7" },
    { value: "SMA_2", label: "SMA Kelas 11" },
  ]);
});

test("cakupan peta mencakup seluruh jenjang nasional", () => {
  // Admin analytics mengelompokkan baris jadwal per string jenjang, jadi
  // peta harus bisa menampilkan jenjang di luar tiga yang terdaftar.
  for (const grade of [
    "SD_5", "SD_6",
    "SMP_1", "SMP_2", "SMP_3",
    "SMA_1", "SMA_2", "SMA_3",
  ]) {
    const label = gradeLabel(grade);
    assert.notEqual(label, grade, `jenjang ${grade} belum punya label`);
    // Nomor kelas harus konsisten dengan jenjangnya.
    const [, tingkat, kelas] = label.match(/^(SD|SMP|SMA) Kelas (\d+)$/) ?? [];
    assert.ok(tingkat && kelas, `format label ${grade} tidak baku: "${label}"`);
    const n = Number(kelas);
    if (tingkat === "SD") assert.ok(n >= 1 && n <= 6, `${label} di luar rentang SD`);
    if (tingkat === "SMP") assert.ok(n >= 7 && n <= 9, `${label} di luar rentang SMP`);
    if (tingkat === "SMA") assert.ok(n >= 10 && n <= 12, `${label} di luar rentang SMA`);
  }
});

// ─────────────────────────────────────────────────────────────
// Lapis 2 — penjaga arsitektur
//
// Ini lapis yang mencegah bug kambuh. Aturannya: label jenjang hanya boleh
// hidup di src/lib/grade-label.ts. File lain wajib memanggil modul itu.
// ─────────────────────────────────────────────────────────────

const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));
const CANONICAL = join("lib", "grade-label.ts");

/** File yang sengaja dikecualikan, beserta alasannya. */
const ALLOWED: Record<string, string> = {
  // Sumber tunggal — di sinilah label memang ditulis.
  ["lib" + sep + "grade-label.ts"]: "modul canonical",
  // Test ini sendiri memuat contoh label; harus boleh menyebutnya.
  ["lib" + sep + "__tests__" + sep + "grade-label.test.ts"]: "berkas tes",
};

/** Kumpulkan semua file .ts/.tsx di src/, rekursif. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Pola yang menandakan peta label lokal sedang dibuat ulang.
 *
 * Sengaja diperluas dari dua kesalahan sebelumnya:
 *  - key objek dengan nilai label  → `SMP_1: "SMP Kelas 7"`
 *  - key string dengan titik dua   → `"SMP_1": "SMP Kelas 7"`
 *  - array pasangan [kode, label]  → `['SMP_1', 'SMP Kelas 7', ...]`
 *  - ternary panjang               → `gradeLevel === "SMP_1" ? "SMP Kelas 7"`
 */
const LOCAL_MAP_PATTERNS: Array<{ name: string; re: RegExp }> = [
  {
    name: "peta objek label",
    re: /["']?(SD_5|SMP_1|SMA_2)["']?\s*:\s*["'`](SD|SMP|SMA)\s+Kelas\s+\d+["'`]/,
  },
  {
    name: "pasangan array [kode, label]",
    re: /\[\s*["'](SD_5|SMP_1|SMA_2)["']\s*,\s*["'`](SD|SMP|SMA)\s+Kelas\s+\d+["'`]/,
  },
  {
    name: "ternary penentu label",
    re: /===\s*["'](SD_5|SMP_1|SMA_2)["']\s*\?\s*["'`](SD|SMP|SMA)\s+Kelas\s+\d+["'`]/,
  },
  {
    name: "baris label literal",
    re: /label\s*:\s*["'`](SD|SMP|SMA)\s+Kelas\s+\d+["'`]/,
  },
];

test("tidak ada peta label jenjang lokal di luar src/lib/grade-label.ts", () => {
  const offenders: string[] = [];

  for (const file of walk(SRC_DIR)) {
    const rel = relative(SRC_DIR, file);
    if (ALLOWED[rel]) continue;

    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, i) => {
      // Abaikan komentar — dokumentasi boleh menyebut label sebagai contoh.
      const code = line.replace(/\/\/.*$/, "");
      if (/^\s*\*/.test(line) || /^\s*\/\*/.test(line)) return;

      for (const { name, re } of LOCAL_MAP_PATTERNS) {
        if (re.test(code)) {
          offenders.push(`${rel}:${i + 1}  [${name}]  ${line.trim()}`);
        }
      }
    });
  }

  assert.deepEqual(
    offenders,
    [],
    "Ditemukan peta label jenjang lokal. Impor dari '@/lib/grade-label' " +
      "(gradeLabel / gradeShort / gradeLabelWith / gradeOptions) alih-alih " +
      "menulis ulang petanya:\n  " +
      offenders.join("\n  "),
  );
});

test("tidak ada label 'SMP Kelas 1' atau 'SMA Kelas 2' yang tersisa", () => {
  // Pemindaian langsung untuk bentuk yang pernah terkirim ke produksi.
  // "SMP Kelas 11" tidak boleh ikut tertangkap, jadi diikuti pembatas non-digit.
  const bad = /(SMP Kelas 1|SMA Kelas 2)(?!\d)/;
  const offenders: string[] = [];

  for (const file of walk(SRC_DIR)) {
    const rel = relative(SRC_DIR, file);
    if (ALLOWED[rel]) continue;

    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (bad.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 120)}`);
    });
  }

  assert.deepEqual(offenders, [], "Label jenjang salah masih ada:\n  " + offenders.join("\n  "));
});

test("modul canonical tetap satu-satunya sumber label", () => {
  // Kalau file ini dipindah/dihapus, penjaga di atas kehilangan rujukan.
  assert.ok(
    readFileSync(fileURLToPath(new URL("../grade-label.ts", import.meta.url)), "utf8").length > 0,
    `modul canonical ${CANONICAL} harus ada`,
  );
});
