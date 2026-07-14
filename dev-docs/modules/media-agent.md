# Modul: Media Agent

> **Path:** `src/agents/media/`
> **File Utama:** `renderer.ts`, `script.ts`, `youtube.ts`

---

## Fungsi

Generate video pembelajaran dengan karakter favorit (Mbappe, Lisa BLACKPINK, dll), text-to-speech, upload ke YouTube.

## File Structure

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel exports |
| `characters.ts` | Definisi karakter (avatar, voice, style) |
| `script.ts` | Generate script video dari materi |
| `renderer.ts` | Render video dari script + karakter |
| `tts.ts` | Text-to-speech (suara karakter) |
| `youtube.ts` | Upload video ke YouTube (unlisted) |
| `worker.ts` | Queue consumer untuk `media-render` dan `media-yt-fallback` |

## Queue

| Queue | Concurrency | Trigger |
|-------|-------------|---------|
| `media-render` | 1 | Material siap dengan deliveryType = VIDEO |
| `media-yt-fallback` | 2 | Render gagal (cari YouTube reference) |

## Data Flow

```
Material dengan deliveryType VIDEO → media-render queue
    │
    ▼
Script Generator → Buat skrip dari konten materi
    │
    ▼
Renderer → Render video dengan karakter
    │
    ├── Upload ke YouTube (unlisted) → simpan URL di metadata
    └── Kalau gagal → media-yt-fallback → cari YouTube reference
```

## Key Logic

- **Karakter** — Mbappe, Lisa BLACKPINK, dan karakter lain di `characters.ts`
- **Tidak simpan video** — langsung upload ke YouTube, tidak simpan file di server
- **Fallback** — kalau render gagal, cari video YouTube yang relevan sebagai referensi
- **Video hanya untuk topik visual** — text lebih cepat untuk topik teoritis
