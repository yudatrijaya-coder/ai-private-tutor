# Modul: LLM Client

> **Path:** `src/llm/`
> **File Utama:** `client.ts`

---

## Fungsi

Abstraksi LLM client untuk komunikasi dengan 9Router gateway lokal. OpenAI-compatible, multi-model routing, fallback chain, auto-logging ApiUsage.

## File Structure

| File | Fungsi |
|------|--------|
| `client.ts` | LLM client — OpenAI-compatible, routing, fallback, retry, logging |
| `types.ts` | Type definitions (AgentRole, LLMCallOptions, LLMResult, dll) |
| `prompts.ts` | System prompts untuk setiap agent role |

## Konfigurasi

```env
LLM_BASE_URL=http://localhost:20128/v1
LLM_API_KEY=sk-9router
```

## Agent Roles

| Role | Default Model | Fallback Chain |
|------|--------------|----------------|
| `tutor` | ai_tutor_agent (combo) | sumopod/deepseek-v4-flash → hermes |
| `curriculum` | ai_tutor_agent | sumopod → hermes |
| `content` | ai_tutor_agent | sumopod → hermes |
| `assessment` | ai_tutor_agent | sumopod → hermes |
| `guardian` | ai_tutor_agent | sumopod → hermes |
| `media_script` | ai_tutor_agent | sumopod → hermes |

## Key Functions (`client.ts`)

| Function | Deskripsi |
|----------|-----------|
| `callLLM(messages, role, options?)` | Main function — call LLM dengan retry + fallback |
| `callLLMStream(messages, role, options?)` | Streaming version |
| `estimateCost(model, tokens)` | Estimasi biaya per request |
| `isLLMReady` | Boolean — true jika 9Router reachable |

## Auto-Logging

Setiap `callLLM` secara otomatis:
1. Mencatat token usage ke tabel `ApiUsage`
2. Menyimpan `AgentLog` untuk tracing
3. Menghitung estimasi biaya

## Fallback Chain

```
Primary: ai_tutor_agent (combo model)
    │ gagal?
    ▼
Fallback 1: sumopod/deepseek-v4-flash
    │ gagal?
    ▼
Fallback 2: hermes
    │ gagal?
    ▼
Throw error → masuk Dead Letter Queue
```
