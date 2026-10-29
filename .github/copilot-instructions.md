# Instruksi untuk GitHub Copilot

## Wajib: baca `ai-state.md` lebih dulu

Sebelum mengusulkan atau menulis perubahan apa pun di repo ini, baca **`ai-state.md`**.
File itu memuat kondisi terkini yang sudah diverifikasi beserta aturan wajib.

Ringkas:
- Build: `bash ops/build.sh` (bukan `npx next build` — pernah OOM-killed)
- Tes: `npm test` (ada penjaga label jenjang)
- Branch: `master`
- Jangan pernah menulis secret — repo ini PUBLIC
- Label jenjang ada di `src/lib/grade-label.ts`; jangan buat peta label lokal
