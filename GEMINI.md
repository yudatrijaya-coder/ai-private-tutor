# GEMINI.md

## ⛔ Baca `ai-state.md` lebih dulu

Sebelum tindakan pertama apa pun, baca **`ai-state.md`** sampai habis. File itu adalah sumber kebenaran untuk kondisi terkini repo ini.

Aturan inti (detail lengkap di `ai-state.md`):
- Verifikasi ke sistem (DB / `pm2 ls` / `ss -tlnp`), jangan percaya dokumen basi
- Build: `bash ops/build.sh` — jangan `npx next build`
- `npm test` sebelum commit
- Jangan commit secret — repo ini **PUBLIC**
- Branch `master`
- Sistem multi-agent **sudah ada** (BullMQ + `AgentLog`) — jangan bangun ulang
