/**
 * Regression test — panel password hash.
 *
 * Kenapa file ini ada
 * -------------------
 * Deploy 2026-10-27 menampilkan login `/system` yang SELALU menolak password
 * yang benar. Penyebabnya bukan bcrypt, melainkan loader env Next: nilai
 * `$2b$12$aX/…` di `.env` diekspansi sebagai variabel, sehingga hash tiba di
 * proses sebagai `/Oq9…`. `bcrypt.compare` lalu mengembalikan false, dan API
 * melaporkan "Password salah" — pesan yang menyesatkan, karena passwordnya
 * benar dan yang rusak adalah konfigurasi.
 *
 * Yang dijaga tes ini:
 *
 *   1. Bentuk ter-escape (`\$2b\$12\$…`) diterima — inilah yang dipakai `.env`.
 *   2. Bentuk mentah (`$2b$12$…`) diterima — dipakai injeksi systemd/docker.
 *   3. Hash yang sudah terlanjur diekspansi (`/Oq9…`) DITOLAK, supaya panel
 *      melaporkan "belum dikonfigurasi" alih-alih menampilkan form yang tidak
 *      mungkin berhasil.
 *
 * Menjalankan:
 *   node --experimental-strip-types --test src/lib/__tests__/panel-password.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { isBcryptHash, parsePasswordHash, unescapeHash } from "../system/panel-password.ts";

/** One real bcrypt hash of "yuda" (cost 12), generated for this test. */
const RAW = "$2b$12$aX/Oq9LGuek9nCIGHJIHbODsju2ejhEohu05bfkQzy3abjVhRD7Ni";
const ESCAPED = RAW.replace(/\$/g, "\\$");

test("unescapeHash mengembalikan hash mentah dari bentuk .env", () => {
  assert.equal(unescapeHash(ESCAPED), RAW);
});

test("unescapeHash tidak mengubah hash mentah", () => {
  assert.equal(unescapeHash(RAW), RAW);
});

test("isBcryptHash menerima kedua bentuk", () => {
  assert.equal(isBcryptHash(RAW), true);
  assert.equal(isBcryptHash(ESCAPED), true);
});

test("isBcryptHash menolak hash yang sudah diekspansi loader", () => {
  // Inilah bentuk yang dulu sampai ke proses: prefix `$2b$12$aX` hilang
  // karena `$2b` dan `$12` dianggap variabel kosong.
  assert.equal(isBcryptHash("/Oq9LGuek9nCIGHJIHbODsju2ejhEohu05bfkQzy3abjVhRD7Ni"), false);
  assert.equal(isBcryptHash(""), false);
  assert.equal(isBcryptHash("yuda"), false);
});

test("parsePasswordHash menormalkan kedua bentuk ke hash yang bisa diverifikasi", async () => {
  for (const input of [RAW, ESCAPED]) {
    const hash = parsePasswordHash(input);
    assert.ok(hash, `harus menerima ${input.slice(0, 8)}…`);
    assert.equal(await bcrypt.compare("yuda", hash), true);
    assert.equal(await bcrypt.compare("salah", hash), false);
  }
});

test("parsePasswordHash menolak hash rusak, bukan meneruskannya ke bcrypt", () => {
  assert.equal(parsePasswordHash(undefined), null);
  assert.equal(parsePasswordHash(""), null);
  assert.equal(parsePasswordHash("/Oq9LGuek9nCIGHJIHbODsju2ejhEohu05bfkQzy3abjVhRD7Ni"), null);
  // Cost bukan dua digit, atau digest kepotong.
  assert.equal(parsePasswordHash(RAW.slice(0, -1)), null);
});
