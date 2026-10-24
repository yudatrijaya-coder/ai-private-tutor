# Modul: Media Agent

> **Path:** `src/agents/media/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Menyusun skrip narasi, membuat audio TTS, merender video pembelajaran, dan menyiapkan
tautan video. Bila render gagal, modul mencari video YouTube sebagai cadangan.

## File

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel export |
| `characters.ts` | Definisi karakter (nama, emoji, `voiceStyle`, warna) |
| `script.ts` | Generate skrip video dari materi |
| `tts.ts` | Narasi via `edge-tts` (Microsoft Edge TTS) — `VOICE_MAP` per karakter |
| `renderer.ts` | Render video dari skrip + audio |
| `youtube.ts` | `uploadToYouTube()` + pencarian video cadangan |
| `worker.ts` | `processMediaRender`, `processMediaYtFallback` |

## Karakter

Tersedia: `mbappe`, `lisa`, `ian`, plus persona `kak-budi`, `kak-dewi`, `kak-raka`
(`characters.ts`). Tiap karakter punya `voiceStyle` dan dipetakan ke suara `id-ID-*`
di `VOICE_MAP` (`tts.ts`).

## Queue

| Queue | Concurrency | Trigger |
|-------|------:|---------|
| `media-render` | 1 | Material `delivery = VIDEO` |
| `media-yt-fallback` | 2 | Render gagal / butuh video pengganti |

## Data Flow

```
Material (delivery VIDEO) → media-render
    ├── script.ts  → skrip narasi
    ├── tts.ts     → audio .mp3 (edge-tts, suara per karakter)
    ├── renderer.ts→ video
    └── youtube.ts → uploadToYouTube() → Material.videoUrl
         │
         └── gagal → media-yt-fallback → cari video YouTube relevan
```

## Kondisi Saat Ini (penting)

`uploadToYouTube()` di `youtube.ts` **masih placeholder**: ia mencatat niat upload,
membuat `videoId` palsu (`placeholder_<8 char>`), lalu menulis
`videoUrl` + `status = READY` ke `Material`. Komentar di source menyebut upload
YouTube Data API asli sebagai "Phase 4". Jadi:

- Jangan menganggap `Material.videoUrl` selalu video hasil render sendiri.
- Video yang benar-benar tayang mayoritas berasal dari kurasi YouTube (`src/data/youtube-*.ts`).

## Endpoint Terkait

`POST /api/media/render`, `POST /api/media/tts`, `GET /api/mindmap/screenshot`.
