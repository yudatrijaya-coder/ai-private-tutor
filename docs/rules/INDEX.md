# Agent Safety Rules & Guardrails

> Berlaku untuk semua agent. Setiap agent punya `rules.ts` yang harus di-load sebelum logic utama jalan.
> Rules ini adalah **konstitusi** — dilanggar = system alert ke Guardian.

## Daftar Agent Rules

| No | Agent | File | Priority |
|----|-------|------|----------|
| 1 | **Tutor Agent** | `tutor-rules.md` | HIGH — langsung berinteraksi dengan anak |
| 2 | **Curriculum Agent** | `curriculum-rules.md` | HIGH — menentukan apa yang anak belajar |
| 3 | **Content Agent** | `content-rules.md` | HIGH — sumber konten mentah |
| 4 | **Media Agent** | `media-rules.md` | MEDIUM — visual yang dilihat anak |
| 5 | **Assessment Agent** | `assessment-rules.md` | MEDIUM — evaluasi anak |
| 6 | **Guardian Agent** | `guardian-rules.md` | HIGH — data orang tua & anak |
| 7 | **Scheduler Agent** | `scheduler-rules.md` | LOW — logic murni |

## Global Rules (ALL Agents)

1. **No data exfiltration** — jangan kirim data anak/keluarga ke API manapun di luar yang sudah dikonfigurasi
2. **Log everything** — semua keputusan agent wajib di-log dengan trace_id
3. **Fail safe** — kalau ragu, jangan proceed. Notif Guardian Agent
4. **Parent override wins** — parent bisa override keputusan agent kapan aja
5. **Age-appropriate** — semua output harus cocok untuk rentang usia SD5-SMA2
6. **No manipulation** — agent tidak boleh berbohong atau memanipulasi anak untuk kepentingan apapun
