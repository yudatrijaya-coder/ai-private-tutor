# Modul: LLM Client

> **Path:** `src/llm/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Klien tunggal untuk semua panggilan model. Memakai SDK `openai` menuju **9Router**
(gateway lokal), dengan routing per-peran, rantai fallback, batas token harian, dan
pencatatan biaya.

## File

| File | Fungsi |
|------|--------|
| `client.ts` | `callLLM()`, `streamMessage`/stream API, `MODEL_ROUTES`, `FALLBACK_CHAIN`, `VISION_MODELS`, `MODEL_PRICING`, `DAILY_TOKEN_CAP` |
| `types.ts` | `AgentRole`, `ChatMessage`, `LLMCallOptions`, `LLMResult`, `ModelPricing` |
| `prompts.ts` | `SYSTEM_PROMPTS` per peran |
| `__tests__/` | — |

## Konfigurasi

```env
LLM_BASE_URL=http://localhost:20128/v1   # default bila tidak diset
LLM_API_KEY=<wajib>
LLM_ALLOW_NO_KEY=1                        # hanya untuk endpoint lokal tanpa auth
```

`resolveApiKey()` **melempar error** bila `LLM_API_KEY` kosong. Tidak ada lagi fallback
`"sk-9router"` — dulu key palsu itu membuat 9Router membalas 401 dan diagnosis jadi
menyesatkan (commit `0207add`).

## Routing

| `AgentRole` | Model utama | Fallback |
|---|---|---|
| `tutor` | `ai_tutor_agent` | `hermes` |
| `curriculum` | `ai_tutor_agent` | `hermes` |
| `content` | `ai_tutor_agent` | `hermes` |
| `assessment` | `ai_tutor_agent` | `hermes` |
| `guardian` | `ai_tutor_agent` | `hermes` |
| `media_script` | `ai_tutor_agent` | `hermes` |

`VISION_MODELS` (untuk `handlers/vision.ts`) mencoba berurutan:
`ai_tutor_agent` → `sumopod/gpt-4o-mini` → `sumopod/gemini/gemini-2.5-flash-lite` →
`sumopod/deepseek-v4-flash`.

## Batas & Biaya

- `DAILY_TOKEN_CAP` = **1.000.000 token per siswa per hari**.
- `MODEL_PRICING` (USD per 1 juta token): `ai_tutor_agent` 0.14/0.28 · `hermes` 0.05/0.10 ·
  `sumopod/gpt-4o-mini` 0.15/0.60 · `sumopod/gemini/gemini-2.5-flash-lite` 0.10/0.40 ·
  `sumopod/deepseek-v4-flash` 0.14/0.28.
- Pemakaian dicatat ke tabel `ApiUsage` (1.475 baris per 2026-10-25); dashboard
  `(dashboard)/dashboard/settings/api-usage`.
- Timeout per peran: `ROLE_TIMEOUT_MS` dengan `DEFAULT_TIMEOUT_MS` sebagai cadangan,
  dan bisa ditimpa lewat `options.timeoutMs`.

## Alur Fallback

```
callLLM(messages, role)
    ├── MODEL_ROUTES[role]  → ai_tutor_agent
    │     gagal (timeout / 5xx / rate limit)?
    ▼
    ├── FALLBACK_CHAIN[role][1] → hermes
    │     gagal juga?
    ▼
    └── throw error → ditangkap pemanggil (worker → retry → DLQ)
```

## Catatan Operasional

- Jangan memanggil OpenAI/provider langsung — semua trafik harus lewat 9Router agar
  routing, pricing, dan pencatatan tetap konsisten.
- 9Router berjalan sebagai PM2 app terpisah (`9router`, port 20128, bind 127.0.0.1).
