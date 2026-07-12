# AI Private Tutor — Design Spec

> **Project Lead:** Hermes Agent (via brainstorming → plan → implementation)
> **Date:** 2026-07-04
> **Stack:** Next.js + PostgreSQL + Redis + Telegraf.js + OpenAI

## Overview

AI-powered private tutor for 3 students: SD kelas 5, SMP kelas 1, SMA kelas 2. Multi-platform (Web + Telegram) dengan 7 agent terintegrasi, masing-masing dengan persona yang disesuaikan preference student.

## Queue Architecture

Infrastruktur komunikasi antar agent. Semua job via BullMQ + Redis biar gak blocking dan bisa retry otomatis.

### Queue Definitions

| Queue Name | Jobs | Worker (Agent) | Priority | Concurrency |
|------------|------|----------------|----------|-------------|
| `curriculum:generate` | Generate draft for new student | Curriculum Agent | High | 2 |
| `content:scrape` | Scrape URL, scrape retry | Content Agent | High | 2 |
| `curriculum:review` | Review raw content, generate processed | Curriculum Agent | High | 2 |
| `media:render` | Generate video, upload YouTube | Media Agent | Medium | 1 |
| `media:yt-fallback` | Search YouTube reference | Media Agent | Low | 3 |
| `assessment:generate` | Generate quiz dari processed_content | Assessment Agent | Medium | 3 |
| `assessment:evaluate` | Koreksi jawaban + update weak areas | Assessment Agent | High | 5 |
| `guardian:report` | Generate weekly report, kirim notif | Guardian Agent | Low | 1 |
| `scheduler:assign` | Assign topik harian/mingguan | Scheduler Agent | Weekly cron | 1 |
| `scheduler:reminder` | Kirim reminder ke Telegram student | Scheduler Agent | Daily cron | 10 |

### Job Payload Template

Semua job pake format seragam:

```json
{
  "job_id": "uuid",
  "type": "content:scrape",
  "created_at": "ISO timestamp",
  "payload": {
    "material_id": "uuid-xxx",
    "topic": "Pecahan",
    "sub_topic": "Penjumlahan",
    "grade_level": "SD/5",
    "student_id": "uuid-student",
    "sources": ["url1", "url2", "url3"]
  },
  "metadata": {
    "trace_id": "uuid — buat tracking cross-agent",
    "source_job": "curriculum:generate:uuid-yyy",
    "priority": 10
  },
  "retry": {
    "max_attempts": 3,
    "backoff": "exponential",
    "delay_seconds": 30
  }
}
```

### Pipeline — Cross-Agent Job Chaining

```
Guardian: admit student
  │
  └── Queue: curriculum:generate {student_id, grade_level}
        │
        └── [Success] → Queue: content:scrape {draft, priority: week_1}
              │
              └── [Success] → Queue: curriculum:review {raw_content}
                    │
                    ├── [Approved] → Queue: assessment:generate {processed_content}
                    │                 Queue: media:render {processed_content, character} (if delivery="video")
                    │
                    └── [Rejected] → Queue: content:scrape {retry, new_sources}
```

### Retry Policy

| Queue | Max Attempts | Backoff | Dead Letter |
|-------|-------------|---------|-------------|
| `content:scrape` | 3 | 30s → 60s → 120s | Masuk DLQ → notif Guardian |
| `media:render` | 2 | 60s → 300s | Masuk DLQ → notif admin |
| `assessment:generate` | 3 | 10s → 30s → 60s | Masuk DLQ → retry manual |
| Lainnya | 3 | Default exponential | Masuk DLQ |

### Dead Letter Queue (DLQ)

- Job gagal setelah max_attempts → pindah ke `{queue}:dlq`
- DLQ items visible di dashboard `/agents`
- Guardian Agent notifikasi: "[Agent] gagal memproses [topic] — cek dashboard"
- Manual retry dari dashboard atau API

### Job Status Flow

```
queued → waiting → active → completed
                        └── failed → retry → active
                                    └── max retry → dlq
```

### Monitoring — Dashboard `/agents`

| Agent | Queue Depth | Last Run | Errors | Status |
|-------|------------|----------|--------|--------|
| Content | 3 pending | 2m ago | 0 | 🟢 |
| Media | 1 rendering | Now | 1 DLQ | 🟡 |
| Assessment | 0 | 5m ago | 0 | 🟢 |

### Redis Usage

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `job:{queue}:{id}` | Job metadata | 7 hari |
| `student:{id}:session` | Active chat session | 24 jam |
| `rate:scrape:{domain}` | Rate limit per domain | 1 jam |
| `lock:render` | Mutex — cuma 1 render at a time | 10 menit |

## Architecture

```
Next.js App (monolith)
├── Web (Student Dashboard & Guardian Dashboard)
├── API Routes (/api/*)
├── Telegram Bot (Telegraf.js webhook)
├── Agent Orchestration Layer (7 agents)
│   ├── Curriculum Agent      — Topik & urutan belajar
│   ├── Content Agent         — Scrape & categorize materi
│   ├── Media Agent           — Generate video + YouTube
│   ├── Assessment Agent      — Quiz/exam & weak areas
│   ├── Tutor Agent           — Chat + multi-modal + NLU + persona
│   ├── Guardian Agent        — ⭐ Admission + Performance Eval + Early Warning + Cross-agent orchestration
│   └── Scheduler Agent       — Jadwal + reminder + motivasi
├── Queue (BullMQ + Redis)
└── Database (PostgreSQL + Prisma)
```

## Database Schema

### Students
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | text | |
| telegram_id | text | unique |
| grade_level | text | SD/5, SMP/1, SMA/2 |
| persona_config | jsonb | {persona_id, deltas} |
| character_preference | jsonb | {name, type, avatar_url, selected_at} — Mbappe, Lisa BLACKPINK, dll |
| parent_contact | text | Telegram ID or WA |

### Personas
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | text | Kak Budi, Kak Dewi, Kak Raka |
| greeting_msg | text | First message template |
| system_prompt | text | LLM persona prompt |
| traits | jsonb | [gembira, sabar, dll] |
| voice_tone | text | casual, formal, playful |
| auto_match_keywords | jsonb | Keywords to auto-suggest this persona |

### Enrollments
| Field | Type | Notes |
|-------|------|-------|
| student_id | UUID | FK |
| grade_level | text | |
| start_date | date | |
| status | text | active, paused, graduated |

### Materials
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| grade_level | text | |
| topic | text | |
| sub_topic | text | |
| source_url | text | Dari mana di-scrape |
| raw_content | text | Hasil scrape |
| processed_content | text | Summarized/cleaned |
| video_url | text | Generated video |
| status | text | raw → processed → video_ready |

### Assessments
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| type | text | quiz, exam |
| material_id | UUID | FK |
| questions | jsonb | [{question, options, answer, explanation}] |
| difficulty | text | easy, medium, hard |
| due_date | timestamptz | Null for quiz (always available) |
| generated_by | text | agent name |

### Attempts
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| student_id | UUID | FK |
| assessment_id | UUID | FK |
| answers | jsonb | [{question_idx, selected, correct, time_spent}] |
| score | decimal | |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| duration_seconds | int | |

### Weak Areas
| Field | Type | Notes |
|-------|------|-------|
| student_id | UUID | FK |
| topic | text | |
| sub_topic | text | |
| mastery_level | decimal | 0-100 |
| attempt_count | int | |
| avg_score | decimal | |
| last_score | decimal | |
| updated_at | timestamptz | |

### Progress Snapshots
| Field | Type | Notes |
|-------|------|-------|
| student_id | UUID | FK |
| snapshot_date | date | |
| overall_mastery | decimal | |
| study_time_total_minutes | int | |
| quiz_avg | decimal | |
| exam_avg | decimal | |
| topics_covered | int | |
| topics_mastered | int | |
| metadata | jsonb | Extra insights |

### Schedule Config
| Field | Type | Notes |
|-------|------|-------|
| student_id | UUID | FK (unique) |
| daily_time | time | Preferred session time |
| daily_duration_minutes | int | Default 15 |
| daily_topics_per_week | int | Default 5 |
| intensive_days | jsonb | ["mon","wed","fri"] |
| intensive_time | time | |
| intensive_duration_minutes | int | 180-240 |
| reminder_before_minutes | int | 30 |
| reminder_missed | boolean | Follow up jika skip |

### Schedule Sessions
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| student_id | UUID | FK |
| type | text | daily, intensive |
| topic | text | |
| scheduled_at | timestamptz | |
| started_at | timestamptz | nullable |
| completed_at | timestamptz | nullable |
| duration_actual_minutes | int | nullable |
| status | text | planned, ongoing, completed, missed, rescheduled |
| quiz_score | decimal | nullable (mini-quiz in intensive) |
| student_feedback | text | nullable |

### Intervention Log
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| student_id | UUID | FK |
| detected_at | date | |
| issue_type | text | missed_sessions, low_score, mastery_stuck, low_engagement, student_complaint |
| severity | text | green, yellow, red |
| description | text | |
| actions_taken | jsonb | [{agent, action, status}] |
| resolved_at | date | nullable |
| resolution_note | text | nullable |

## 7 Agents — Detail

### 1. Curriculum Agent

- **Role:** Source of truth untuk kurikulum. Bikin draft kurikulum per student pas admission, tentuin topik & sub-topik berdasarkan jenjang, pilih mana yang dibuat video vs text-only, lalu finalize setelah student pilih karakter.

- **Tanggung jawab:**

  **A. Generate Curriculum Draft (Pas Admission)**
  - Setelah Guardian Agent admit student, Curriculum Agent langsung generate **curriculum draft** per student:
    ```
    Trigger: Student admitted → grade_level = "SD/5"
      │
      Curriculum Agent:
      ├── Search internet: "Kurikulum Merdeka SD kelas 5 [mapel]"
      │   ├── Matematika: Pecahan, Bangun Datar, Kecepatan, Debit, Volume
      │   ├── Bahasa Indonesia: Teks Narasi, Puisi, Laporan, Iklan
      │   ├── IPA: Organ Gerak Hewan, Sistem Pernapasan, Cahaya
      │   ├── IPS: Indonesia sebagai Negara Maritim, Keragaman Budaya
      │   └── ... (sesuai hasil search)
      │
      ├── Structur ke format baku:
      │   {
      │     grade: "SD/5",
      │     subjects: [
      │       {
      │         name: "Matematika",
      │         topics: [
      │           { topic: "Pecahan", sub_topics: ["penjumlahan", "pengurangan", "desimal"],
      │             delivery: "video" | "text" },    // ← tentuin dari awal yang cocok video
      │           { topic: "Bangun Datar", sub_topics: ["luas", "keliling"],
      │             delivery: "video" }
      │         ]
      │       }
      │     ],
      │     status: "draft"    // masih draft, nunggu karakter
      │   }
      │
      └── Simpan ke DB: curriculum_drafts (per student, status: draft)
    ```

  **B. Klasifikasi Delivery Type — Video vs Text/PDF**
  - Tiap topik dikasih label `delivery: "video" | "text"`:
    | Type | Cocok untuk |
    |------|-------------|
    | **Video** | Konsep abstrak, rumus, proses, demontrasi — butuh visual + narasi |
    | **Text/PDF** | Definisi, bacaan, tabel, rumus yang udah jelas — cukup scrap dari internet |
  - Pertimbangan: topik yang butuh visual (geometri, IPA praktikum, grafik) → video
  - Topik yang tekstual (sejarah, definisi, bacaan) → text/PDF

  **C. Finalisasi Draft — Tunggu Karakter Student**
  - Curriculum draft tetap `status: draft` sampe student kasih feedback aktor:
    ```
    Setelah student pilih karakter (saat admission):
      ├── "Kakak pengennya diajarin sama siapa? Mbappe? Lisa BLACKPINK? Atau kartun favorit?"
      ├── Student jawab → simpan ke student.character_preference
      │
      ├── Kalau student udah pick:
      │   ├── Curriculum Agent: finalisasi draft → status: "final"
      │   ├── Tandai topik priority: "week_1", "week_2" (urut belajar)
      │   └── Kirim final draft ke Content Agent
      │
      └── Kalau student belum pick (skip):
          ├── Draft tetap "draft"
          └── Tutor Agent akan tanya lagi pas first chat
    ```

  **D. Maintain Curriculum (Jangka Panjang)**
  - Update kurikulum kalau ada perubahan dari Kurikulum Merdeka
  - Tambah topik baru sesuai kebutuhan student
  - Tracking progress: topik mana yang udah dipelajari, mana yang masih pending

- **Input:** Student grade_level dari admission, hasil search internet, student character preference
- **Output:** curriculum_drafts (draft → final), priority sequence per student
- **Depends on:** — (paling independent, generate dari internet search)
- **Search strategy:** Web search per mapel + jenjang → extract topik-list → struktur → simpan

#### Curriculum Draft Table

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| student_id | UUID | FK |
| grade_level | text | SD/5, SMP/1, SMA/2 |
| subjects | jsonb | `[{name, topics: [{topic, sub_topics[], delivery, priority}]}]` |
| status | text | draft, final, active, completed |
| character_pending | boolean | True sampe student pilih karakter |
| created_at | timestamptz | |
| finalized_at | timestamptz | nullable — pas student pilih karakter |

#### Flow Diagram: Admission → Curriculum → Character → Final

```
Guardian Agent: Admit student
  │
  ▵
Curriculum Agent:
  ├── 1. Search internet: topik per mapel per grade
  ├── 2. Generate curriculum_draft (status: draft)
  ├── 3. Klasifikasi delivery: video vs text/PDF
  └── 4. Simpan draft — tunggu karakter
  │
  ▵
Guardian Agent (saat admission):
  ├── Tanya: "Kakak mau tutor videonya pakai karakter siapa?"
  │   ├── Pilihan: "Mbappe", "Lisa BLACKPINK", "Karakter kartun", "Lainnya"
  │   ├── Wajib diisi? → Recommended tapi bisa skip
  │   └── Kalau skip → Tutor Agent tanya ulang pas first chat
  │
  ▵
Curriculum Agent (setelah karakter dipilih):
  ├── 1. Finalisasi draft → status: "final"
  ├── 2. Assign priority: week_1, week_2, ...
  └── 3. Kirim final draft → Content Agent
  │
  ▵
Content Agent: mulai scrape konten
```

### 2. Content Agent

- **Role:** Eksekutor scraping konten. Terima final draft dari Curriculum Agent, scrape tiap topik dari internet, simpan raw_content, lalu **Curriculum Agent verifikasi** sebelum lanjut.

- **Tanggung jawab:**

  **A. Scrape by Priority — Jangan Scrape Semua Sekaligus**
  - Content Agent gak scrape semua topik langsung. Dia scrape sesuai **priority** (week_1 dulu, week_2 nanti):
    ```
    Terima final draft → ambil priority = "week_1" topics:
      ├── Untuk yg delivery = "text":
      │   ├── Search: "materi [topic] [sub_topic] SD kelas 5"
      │   ├── Extract content dari web → simpan sebagai raw_content
      │   └── Material status → "raw"
      │
      └── Untuk yg delivery = "video":
          ├── Search: "materi [topic] [sub_topic] SD kelas 5"
          ├── Extract + simpan raw_content
          ├── Material status → "raw"  (video belum dibuat — nunggu queue Media Agent nanti)
          └── Search juga YouTube reference → simpan youtube_url (fallback sementara)
    ```

  **B. Content Extraction & Processing**
  - Scrape dari multi-source (3 web sekolah/sumber berbeda, ambil yang paling lengkap)
  - Clean HTML → Markdown (hapus navbar, iklan, related articles)
  - Simpan `raw_content` (full) dan nanti `processed_content` (summarized/cleaned)
  - Deteksi gambar/diagram dalam konten → download & simpan reference

  **C. Handling Gagal Scrape**
  - Kalau 1 sumber gagal → fallback ke sumber lain
  - Kalau semua sumber gagal → flag `scrape_failed: true` → notif Guardian Agent → manual input fallback
  - Kalau konten scraped kurang lengkap → flag `partial_content: true` → tetap simpan, append note "perlu dilengkapi"

- **Verification — SIAPA YANG VERIFY?**

  Yang verify: **Curriculum Agent.**

  Alasannya:
  - Curriculum Agent yang tahu **apa yang seharusnya ada** di tiap topik (matching dengan kurikulum)
  - Content Agent cuma executor — dia scrape apa yang ada di internet, tapi gak bisa judge apakah kontennya sesuai kurikulum
  - Curriculum Agent yang buat draft, jadi paling cocok **review & approve** hasil scrape

  **Verification Flow:**
  ```
  Content Agent: selesai scrape week_1 topics
    │
    ▵
  Curriculum Agent Review:
    ├── 1. Baca raw_content dari Content Agent
    ├── 2. Check:
    │   ├── ✅ Konten sesuai kurikulum? → approve → status: "processed"
    │   ├── ❌ Konten kurang lengkap? → flag "kurang: [detail]" → Content Agent scrape ulang
    │   └── ❌ Konten salah topik? → discard → Content Agent cari sumber baru
    ├── 3. Generate processed_content (ringkasan bersih):
    │   ├── Summarize raw_content → poin-poin penting
    │   ├── Struktur: Pendahuluan → Isi → Contoh → Latihan
    │   └── Simpan ke materials.processed_content
    │
    ▵
    └── Kalau approved + processed:
        ├── Trigger Assessment Agent (generate quiz) — kalau material ready
        └── Trigger Media Agent (buat video) — cuma untuk delivery="video"
  ```

- **Input:** curriculum_draft (final, per priority batch), student grade, topic list
- **Output:** Materials (status: raw → processed setelah Curriculum Agent verify)
- **Depends on:** Curriculum Agent (draft + verification), internet search/scrape tools
- **Queue Strategy:** Scraping based on priority. Minggu 1 scrape week_1 topics. Minggu 2 scrape week_2 topics. Keep queue shallow.

#### Verification & Population Pipeline — Full Flow

```
Curriculum Agent: Final Draft ✅
  │
  ▵
Content Agent:
  ├── Scrape week_1 topics (text + video sources)
  ├── Simpan raw_content (status: raw)
  └── Notify Curriculum Agent: "ready for review"
  │
  ▵
Curriculum Agent:
  ├── Review raw_content per topic
  ├── Approve / Reject / Flag partial
  ├── Generate processed_content (ringkasan)
  ├── Update material status → "processed"
  └── Trigger downstream:
      │
      ├── Assessment Agent:
      │   └── Generate quiz dari processed_content
      │
      └── Media Agent:
          └── Cuma untuk delivery="video":
              ├── Ambil processed_content
              ├── Generate script + TTS + render sesuai karakter student
              └── Upload YouTube → status: "video_ready"

Populate:
  ├── Student lihat materi via Web: processed_content (text) + video_url (kalau ada)
  ├── Student lihat via Telegram: kirim ringkasan + link YouTube
  └── Quiz siap via Assessment Agent
```

#### Key Design Decisions

| Keputusan | Alasan |
|-----------|--------|
| Curriculum Agent yang verify, bukan human | Student是自己 anak — parent gak akan mikirin verifikasi konten. Curriculum Agent udah punya konteks kurikulum. |
| Scrape per priority, bukan semua | Biar gak boros bandwidth & storage. Student butuh week_1 dulu. |
| Delivery type dipisah (video vs text) | Video mahal & lama. Text/PDF cepat & murah. Yang butuh visual aja yang dibuat video. |
| Karakter ditanya saat admission | Biar Media Agent bisa prepare template sejak awal, gak nunggu-nunggu. |
| Draft tetap "draft" sampe karakter dipilih | Curriculum gak bisa final tanpa tahu format videonya (karakter mempengaruhi script style). |
| YouTube reference sebagai fallback | Student tetap bisa belajar sementara nunggu video asli jadi. |

### 3. Media Agent

- **Role:** Transform processed_content → video dengan karakter student. Generate + upload YouTube + hybrid sourcing (fallback YouTube reference). Queue-based rendering biar gak overload server.

- **Tanggung jawab:**

  **A. Script Generation — dengan Karakter Student**
  - Input: `processed_content` + `character_preference` + `persona`
  - LLM generate script video yang **karakternya ngajar** pake gaya persona:
    ```
    CHARACTER: Mbappe (athlete)
    PERSONA: Kak Budi (SD, playful)
    TOPIC: Pecahan Sederhana — Matematika SD5
    
    → Script:
    [0:00-0:12 INTRO] "Halo! Gua Mbappe! Kali ini gua ajarin lu pecahan. 
                        Bayangin lapangan bola dibagi 4 bagian..."
    [0:12-0:35 ISI 1] "Nah, 1 dari 4 bagian itu = 1/4. Paham?"
    [0:35-0:50 CONTOH] "Kayak gua bikin gol dari 3 tendangan, 3/4 nya masuk!"
    [0:50-1:05 LATIHAN] "Coba: kalau lapangan dibagi 8, lu ambil 3 bagian = ?"
    [1:05-1:15 OUTRO] "Mantap! Besok kita lanjut lagi. Au revoir!"
    ```
  - Script structure: Intro → Isi (2-3 konsep) → Contoh → Latihan interaktif → Outro
  - **Approach: LLM prompt per karakter.** Simpan template prompt per character type (athlete, kpop, cartoon, generic).
    Karakter mempengaruhi: analogi yang dipake, referensi, gaya bahasa, intro/outro catchphrase.
  - Output: `script.json` — {segments: [{start_time, end_time, text, visual}]}

  **B. TTS — Voice Narration**
  - Pilih voice source berdasarkan karakter:
    | Karakter Type | Voice Source | Cost |
    |--------------|-------------|------|
    | Generic (Kak Budi/Dewi/Raka) | Edge TTS (ID voice) | Free |
    | Athlete (Mbappe, Ronaldo) | Edge TTS (ID, tanpa mimic) | Free |
    | K-pop Idol (Lisa, dll) | Edge TTS (ID/EN) | Free |
    | Custom (user request) | ElevenLabs / Open AI TTS / Fish Audio | $$$ |
  - **Filosofi:** Gak ada TTS yang bisa mimic persis suara artis. Jadi strateginya:
    - Video pake **suara persona** (Kak Budi cheerful) sebagai default — bukan mimic artis
    - Karakter muncul di **visual** (gambar di pojok, thumbnail, intro animasi)
    - Di script, karakter disebut dan "ngomong" dalam artian kata-katanya ditulis seolah mereka
    - Kalau budget nambah, bisa ElevenLabs voice cloning
  - Output: `audio.mp3` + `timing.json` (word-level timestamps kalau perlu)

  **C. Visual Render — 2 Approach**
  - **Default approach: Slide + Character Overlay** (FFmpeg-based, CPU):
    ```
    Skema 1 slide = 1 konsep:
      ┌──────────────────────────┐
      │  Pecahan Sederhana       │ ← Judul
      │                          │
      │  🍕 Pizza dibagi 4       │ ← Ilustrasi (generated/text)
      │  1 potong = 1/4          │ ← Rumus
      │                          │
      │  ┌──────────────────┐    │
      │  │  ⚽ Mbappe       │    │ ← Karakter PNG (pojok kanan bawah)
      │  │  "Mantap!"       │    │ ← Speech bubble
      │  └──────────────────┘    │
      └──────────────────────────┘
    ```
    - Pros: CPU-only, fast, cheap
    - Cons: static, gak ada animasi complex
    - **Filosofi:** Video edukasi anak — yang penting konten jelas & engaging, bukan animasi complex

  - **Premium approach: Remotion** (React programmatic video):
    - Kalau nanti budget ada & student butuh quality tinggi
    - Slide animasi, transisi, progress bar, dynamic text
    - GPU needed

  - **Rendering pipeline (FFmpeg):**
    ```
    1. Generate slide images (Puppeteer/Sharp render HTML → PNG)
    2. Overlay karakter PNG di tiap slide (pojok kanan)
    3. Concatenate audio (TTS) + gambar slides → video MP4
       - Tiap slide durasi sesuai script segment timing
    4. Add background music (free royalty — lofi, ambient, beda per grade)
    5. Add intro/outro bumper (karakter + logo)
    6. Output: 720p MP4, H.264, ~1-2 MB/menit
    ```

  **D. YouTube Upload**
  - Upload as **unlisted** (private link, cuma student & parent yang bisa akses)
  - Set thumbnail: karakter + judul topik (generated dari HTML → screenshot)
  - Set deskripsi: ringkasan + link ke web dashboard
  - Playlist: per student (biar terorganisir)
  - Simpan ke DB: `materials.video_url`, `materials.thumbnail_url`
  - **Storage decision:** Video TIDAK disimpan di server. Cuma YouTube URL. Server cuma simpan script + slide assets sementara (delete setelah upload).

  **E. Hybrid Sourcing — Fallback Logic**
  ```
  Student request topik X:
    │
    ├── Cek DB: apakah materials.video_url sudah ada?
    │   ├── ✅ Ada (status: video_ready) → kirim link
    │   └── ❌ Belum ada → lanjut
    │
    ├── Cek: apakah video sedang di-render? (queue: media:render)
    │   ├── ✅ Iya → kirim: "Video Mbappe lagi dibuat! Selesai ~30 menit ya ⏳"
    │   └── ❌ Tidak → lanjut
    │
    └── Cek YouTube reference:
        ├── Search: "materi [topic] [sub_topic] [grade_level] Indonesia"
        ├── Cari video dengan durasi 3-10 menit, relevan, kualitas bagus
        ├── Simpan sebagai youtube_url sementara
        ├── Student tetap bisa belajar
        └── Generated video tetap diproses di background → notifikasi pas ready
  ```

- **Queue — Render Priority:**
  | Priority | Conto | Action |
  |----------|-------|--------|
  | High | Topik week_1, student lagi nunggu | Render sekarang |
  | Medium | Topik week_2, masih ada waktu | Queue belakang |
  | Low | Topik lama yang perlu update | Nunggu idle time |
  - Concurrency: max **1 render** at a time (CPU/GPU heavy). Queue sisanya.

- **Video Pipeline Step-by-Step:**
  ```
  Queue: media:render job
    │
  1. Load: processed_content + character_preference + persona
  2. LLM → generate script.json (segments with timing)
  3. Generate slide assets (HTML → PNG)
  4. Generate TTS audio (Edge TTS → audio.mp3)
  5. Overlay karakter PNG on each slide
  6. FFmpeg: concat audio + images → video.mp4
  7. Generate thumbnail (karakter + judul)
  8. Upload YouTube (unlisted) + set thumbnail
  9. Update materials: video_url, thumbnail_url, status=video_ready
  10. Notify student via Tutor Agent
  ```

- **Related DB changes:**
  - Tambah field ke `materials`: `character_themed_script` (jsonb, null → filled after render)
  - Tambah field: `youtube_fallback_url` (text, nullable — YouTube reference sementara)

- **Input:** Materials (processed_content, delivery="video"), character_preference, persona
- **Output:** Materials (status: video_ready, youtube_url), Notifikasi ke Tutor Agent
- **Depends on:** Curriculum Agent (processed_content via verification), Content Agent (raw content sources)

### 4. Assessment Agent
- **Role:** Generate quiz & exam, evaluate hasil, track weak areas
- **Tanggung jawab:** 
  - Generate quiz otomatis dari `processed_content` (5-10 soal per topik, mixed difficulty)
  - Generate exam periodik (multi-topik, 20-30 soal, 2 mingguan/bulanan)
  - Koreksi jawaban student → hitung score, duration, correct/incorrect
  - Update `weak_areas` & `mastery_level` per topik berdasarkan performa
  - Trigger `progress_snapshot` periodik (mingguan)
  - Generate mini-quiz dalam sesi intensif (10-15 soal tiap 45-menit segmen)
- **Input:** Materials (processed/video_ready), Attempts history, WeakAreas current
- **Output:** Assessments, Attempts, WeakAreas updates, Progress snapshots
- **Depends on:** Content Agent (materi), Curriculum Agent (topik structure)
- **Quiz types:**
  | Type | Format | Count | Frekuensi |
  |------|--------|-------|-----------|
  | Quick quiz | Pilihan ganda | 5 | Tiap materi selesai |
  | Daily check | Pilihan ganda | 3-5 | Akhir sesi harian |
  | Intensive mini-quiz | Pilihan ganda + isian | 10-15 | Per segmen sesi intensif |
  | Exam | Pilihan ganda | 20-30 | 2 mingguan / bulanan |
- **Evaluation:** LLM generate penjelasan benar/salah per soal, update mastery per sub-topic (0-100). Mastery naik +10-15 tiap attempt bagus, turun -5-10 tiap buruk.

#### Alur Generate Quiz (Step-by-Step)

```
Trigger: Material status → video_ready
  │
  ▵
Step 1: Read processed_content (teks materi yang sudah bersih)
  │
  ▵
Step 2: LLM prompt generate soal
  │
  ├─── Input: processed_content + grade_level + topic + sub_topic
  ├─── Count: 5 soal (quick quiz) atau 20-30 (exam)
  ├─── Difficulty: mixed (auto detect dari konten) atau eksplisit
  └─── Output: Array soal dalam JSON
  │
  ▵
Step 3: Validasi soal
  ├─── Apakah jawaban ada di konten?
  ├─── Apakah distractor (pilihan salah) plausible?
  └─── Kalau tidak valid → regenerate soal tsb
  │
  ▵
Step 4: Simpan ke database
  └─── assessments table: questions (JSONB), type, material_id, difficulty
```

#### Format JSON Soal

```json
{
  "questions": [
    {
      "id": "q-001",
      "question": "Berapa hasil dari 2x + 3 = 7?",
      "options": [
        {"id": "A", "text": "1"},
        {"id": "B", "text": "2"},
        {"id": "C", "text": "3"},
        {"id": "D", "text": "4"}
      ],
      "answer": "B",
      "explanation": "Kurangi 3 dari kedua sisi: 2x = 4. Bagi 2: x = 2.",
      "difficulty": "easy",
      "topic": "Persamaan Linear",
      "sub_topic": "SPLDV Satu Variabel",
      "concept_tested": "isolasi variabel"
    }
  ]
}
```

#### Alur Koreksi Jawaban

```
Student submit jawaban:
  │
  ▵
Step 1: Hitung score
  ├─── Total soal: N
  ├─── Benar: B
  ├─── Salah: S
  ├─── Score = (B / N) × 100
  └─── Duration = completed_at - started_at (detik)
  │
  ▵
Step 2: Generate penjelasan via LLM
  ├─── Tiap soal yang salah → penjelasan khusus student
  ├─── Tiap soal yang benar → konfirmasi + reinforcement
  └─── Format: "Kak Budi jelasin ya..."
  │
  ▵
Step 3: Update weak_areas
  ├─── Per sub_topic yang di-test:
  │     current_mastery = weak_areas.mastery_level
  │     new_mastery = current_mastery + delta
  │     
  │     Delta rules:
  │     ├─── Score ≥ 80%: +15 mastery
  │     ├─── Score 60-79%: +10 mastery
  │     ├─── Score 40-59%: +5 mastery
  │     ├─── Score 20-39%: -5 mastery
  │     └─── Score < 20%: -10 mastery
  │     
  │     Clamp: 0 ≤ mastery ≤ 100
  │
  └─── Update: attempt_count++, avg_score, last_score, updated_at
  │
  ▵
Step 4: Trigger progress_snapshot
  └─── Kalau ini attempt pertama minggu ini → snapshot baru
```

#### Mastery Level Logic

```
Mastery thresholds:
  0-30:  🔴 Red    — "Butuh perhatian khusus"
  31-50: 🟧 Orange — "Sedang berkembang"
  51-70: 🟡 Yellow — "Cukup baik"
  71-85: 🟩 Light  — "Bagus"
  86-100:🟩 Green  — "Mastered!"

Behavior:
  - Mastery ≥ 80: topik jarang muncul di quiz (spaced repetition)
  - Mastery ≤ 40: topik sering muncul, prioritas di jadwal harian
  - Mastery 0 setelah 3x attempt buruk: flag ke Tutor Agent → "Kak Budi, ini perlu dijelasin ulang"
```

#### LLM Prompt untuk Generate Soal

```
Kamu adalah guru [jenjang]. Buat [count] soal pilihan ganda dari materi berikut:

MATERI:
---
[processed_content]
---

RULES:
- Soal harus bisa dijawab dari materi di atas
- Tiap soal punya 4 pilihan (A, B, C, D)
- Hanya 1 jawaban benar
- Distractor (pilihan salah) harus plausible (gampang salah pilih)
- Susun soal dari easy → medium → hard
- Format output: JSON array

TOPIC: [topic]
SUB-TOPIC: [sub_topic]
GRADE: [grade_level]
```

#### Exam Generation

```
Trigger: Scheduler (2 mingguan/bulanan)
  │
  ▵
Input: 3-5 topik terakhir yang dipelajari
  │
  ▵
Generate: 20-30 soal (campuran semua topik)
  ├─── 40% dari topik terbaru
  ├─── 40% dari topik sebelumnya (spaced repetition)
  └─── 20% dari topik random (retention check)
  │
  ▵
Due date: 3-7 hari dari generate
  │
  ▵
Notifikasi ke student via Tutor Agent: "Ada ujian nih! Siap?"
```

#### Mini-Quiz Intensif

```
Dalam sesi intensif (3-4 jam):
  ├─── Tiap 45 menit belajar → 10 menit break
  └─── Setelah break → mini-quiz 5 soal (quick retention check)
  
Logic:
  - Score ≥ 60%: lanjut topik berikutnya
  - Score < 60%: ulang segmen sebelumnya dengan penjelasan berbeda
```

### 5. Tutor Agent (Telegram Bot)
- **Role:** Interface utama student — tanya jawab, quiz via chat, reminder, guidance, motivasi.
  Harus bisa handle **natural language**, **gambar**, dan **request ad hoc** kapan aja — nggak cuma pas jam belajar.
- **Tanggung jawab:**
  - Handle **semua** chat Telegram — teks, foto, sticker, voice note
  - **Natural Language Understanding (NLU)** — anak-anak nggak pake command. "Kak gimana ngerjain ini?" + foto langsung diproses. Tutor Agent harus paham intent dari chat natural:
    - "Kak susah nih" → minta bantuan soal
    - "Ada PR" → foto soal → bantu jawab
    - "Aku bosen" → motivasi/saran selingan
    - "Kak ajarin ini dong" → request belajar topik tertentu
    - "Besok ulangan" → request review + quiz kilat
  - Auto-select atau student-select persona (Kak Budi/Dewi/Raka + custom character)
  - **Multi-modal input:** foto soal, screenshot buku, foto catatan → detect `message.photo` → kirim ke **vision LLM** → jawab dengan persona style. Bisa juga foto + caption digabung.
  - Session state management (chat mode / vision_answer / quiz_active / choosing_topic / waiting_quiz_answer)
  - Routing permintaan ke agent lain (video request, report, jadwal)
  - Kirim quiz interaktif 1 soal per chat (biar nggak overwhelm)
  - Handle commands & **natural language**:
    - `/start` atau "Halo kak" → welcome / register
    - `/tanya <teks>` atau "Kak ..." → tanya materi
    - **Foto + "gimana ngerjain ini"** → vision LLM (otomatis deteksi)
    - "Besok ulangan" → trigger quiz kilat dari Assessment Agent
    - "Kak ajarin pecahan" → Curriculum Agent cari materi → Content Agent siapkan
  - **Ad hoc request:** kapan aja anak chat di luar jam belajar, Tutor Agent tetap respon (gak ditolak). Bedanya: kalau di luar jam, gak dicatat sebagai sesi belajar resmi (kecuali ada konten materi yang dibahas → flag sebagai informal learning)
  - Weekly motivation delivery (kirim link video motivasi dari Scheduler)

#### Persona System Detail

```
Persona selection flow:
  Student pertama kali /start
    │
    ▵
  Tutor tanya: "Mau Kak Budi, Kak Dewi, atau Kak Raka yang nemenin?"
    │
    ▵
  Student pilih (atau auto-match dari chat style)
    │
    ▵
  Simpan ke student.persona_config:
    {
      persona_id: "kak-budi",
      custom_character: {
        name: "Lisa BLACKPINK",
        type: "kpop_idol",
        avatar_image: "/characters/student-01/lisa.jpg"
      }
    }
    │
    ▵
  Semua chat selanjutnya pakai persona ini (consistent)
    │
    ▵
  Bisa ganti kapan aja via /ganti
```

**Persona traits:**
| Persona | Jenjang | Style | Bahasa | Analogi | Emoji/Stiker |
|---------|---------|-------|--------|---------|--------------|
| Kak Budi | SD | Gembira, playful, pujian terus | Sederhana, banyak emoji | Kehidupan sehari-hari (makanan, mainan) | Banyak 🎉😊👏 |
| Kak Dewi | SMP | Santai tapi tegas, remaja | Remaja, slang ringan | Kehidupan remaja (sekolah, sosmed, olahraga) | Moderat 💪🔥 |
| Kak Raka | SMA | Dewasa, logis, fokus | Formal tapi ramah | Real-world, karir, teknologi | Minimal, profesional |

**Custom character overlay:**
- Student bisa set karakter favorit (artis, atlet, dll) via /karakter
- Karakter muncul di: intro video D-ID, slide pojokan, thumbnail
- Script LLM referensikan karakter 1-2x per video/chat

#### Commands

| Command | Deskripsi | Flow |
|---------|-----------|------|
| `/start` | Register + pilih persona | Welcome → pilih persona → daftar commands |
| `/pelajaran` | Lihat daftar materi | List topik → pilih → kirim ringkasan + link video YouTube |
| `/quiz` | Mulai quiz | Kirim soal 1 → tunggu jawaban → soal 2 → ... → score |
| `/tanya <teks>` | Tanya materi | Forward ke LLM dengan konteks materi + persona style |
| `/jadwal` | Lihat jadwal | Hari ini + minggu ini (dari Scheduler Agent) |
| `/ganti` | Ganti persona | List persona → pilih → update config |
| `/nilai` | Progress ringkasan | Weak areas, mastery, quiz avg, waktu belajar |
| `/karakter` | Set karakter favorit | Input nama karakter → Content Agent cari gambar → simpan |

#### Quiz Interaction di Telegram (1 Soal per Chat)

```
Student: /quiz
  │
  ▵
Tutor: "Oke Kak Budi siapin soal! Soal 1 dari 5:
        Berapa 2x + 3 = 7?
        A. 1
        B. 2
        C. 3
        D. 4"
  │
  ▵
Student: "B"
  │
  ▵
Tutor: "Bener! 🎉 Jawabannya 2. Kak Budi jelasin:
        Kurangi 3 dari kedua sisi → 2x = 4 → x = 2
        
        Soal 2 dari 5: ..."
  │
  ▵
[Repeat sampai soal 5]
  │
  ▵
Tutor: "Selesai! Score kamu: 4/5 (80%)
        Topik Persamaan Linear: mastery naik jadi 75!
        
        /pelajaran untuk lanjut atau /quiz lagi?"
```

**State management:**
```
session_state: {
  mode: "chat" | "quiz_active" | "vision_answer" | "choosing_topic" | "waiting_quiz_answer",
  current_quiz_id: "uuid" | null,
  current_question_idx: 0,
  answers: [],
  context: {last_topic, last_material_id, last_photo_file_id, last_intent},
  ad_hoc: false  // true kalau ini di luar jam belajar
}
```

#### Routing ke Agent Lain

```
Student request → Tutor Agent evaluate:
  ├─── [foto] → detect foto (soal/catatan/buku) → Vision LLM → jawab dengan persona
  ├─── [teks + foto] → gabung caption + foto → Vision LLM → jawab dengan persona
  ├─── "Kak susah nih" / "Bantu dong" → LLM intent detect → cari konteks (materi terakhir/weak areas) → bantuan
  ├─── "Besok ulangan" → LLM intent detect → Assessment Agent (quiz kilat review)
  ├─── "Kak ajarin [topik]" → Curriculum Agent (cek materi) → Media Agent (kirim video)
  ├─── "Mau belajar gravitasi" → Curriculum Agent (cek materi) → Media Agent (kirim video)
  ├─── "/quiz" → Assessment Agent (generate/get quiz)
  ├─── "/jadwal" → Scheduler Agent (ambil jadwal)
  ├─── "/nilai" → Guardian Agent (progress summary)
  ├─── "/karakter Lisa" → Content Agent (cari gambar) → Media Agent (update avatar)
  └─── "Tanya jawab materi" → LLM dengan konteks materi + persona (direct)
```

#### Input / Output Format

**Input:**
```json
{
  "telegram_message": {
    "chat_id": 123456789,
    "text": "B",
    "student_id": "uuid-student-01"
  },
  "session_state": {
    "mode": "quiz_active",
    "current_quiz_id": "uuid-quiz-001",
    "current_question_idx": 2
  },
  "student_context": {
    "name": "Andi",
    "grade_level": "SMP/1",
    "persona_id": "kak-dewi",
    "character_preference": {"name": "Mbappe", "type": "athlete"}
  }
}
```

**Output:**
```json
{
  "reply": "Bener! 🎉 Jawabannya 2...",
  "actions": [
    {"type": "update_session", "state": {"mode": "quiz_active", "current_question_idx": 3}},
    {"type": "trigger_assessment", "quiz_id": "uuid-quiz-001", "action": "evaluate"}
  ]
}
```

### 6. Guardian Agent (Parent-Facing — Admission, Oversight, Performance)

- **Role:** Wali dari sistem. Gerbang untuk parent — handle admission murid baru, monitor performa, tracking intervensi, koordinasi dengan agent lain untuk penyesuaian kurikulum/konten.

- **Tanggung jawab:**

  **A. Admission & Student Management**
  - Handle registrasi murid baru dari parent (via Telegram atau Web):
    ```
    Parent: "Tambah anak baru ya"
      │
      Guardian:
      ├── Tanya: Nama anak, kelas (SD5/SMP1/SMA2), Telegram ID
      ├── Tanya: Interests / hobi (buat custom character reference)
      ├── Auto-assign: Persona default sesuai jenjang
      ├── Auto-assign: Schedule config (daily 15min pagi + intensive 3x/minggu)
      ├── Simpan ke DB:
      │   ├── students (active=true)
      │   ├── enrollments (status=active, start_date=now)
      │   ├── sched_config (default daily & intensive)
      │   └── weak_areas (initialize empty per topic)
      └── Trigger Tutor Agent: kirim welcome ke Telegram anak
    ```
  - Manage student lifecycle: aktifkan, pause (libur), luluskan, archive
  - Handle perubahan kelas (kenaikan SD5→SD6 di tahun depan)

  **B. Performance Evaluation & Early Warning**
  - Generate periodik **Guardian Report** (mingguan + bulanan):
    ```
    Guardian Report (Weekly):
      ├── Ringkasan per anak:
      │   ├── Total waktu belajar (jam)
      │   ├── Quiz average minggu ini
      │   ├── Topik yang dipelajari
      │   ├── Mastery trend (naik/turun/stuck)
      │   ├── Top 3 weak areas → rekomendasi
      │   └── Sesi terlewat (missed count)
      ├── Perbandingan dengan minggu lalu
      ├── Rekomendasi intervensi (kalau ada masalah)
      └── Evaluation Agent coordination:
          Kalau ada anak tertinggal → notif parent → koordinasi Content Agent buat materi remedial → Scheduler Agent tambah jadwal
    ```
  - **Early Warning System** — flag otomatis kalau:
    - 3 hari berturut-turut gak belajar (skip jadwal)
    - Quiz score < 40% di 3+ topik berbeda
    - Mastery stuck di < 40% > 2 minggu
    - Total belajar < 30 menit dalam seminggu
    - Feedback dari Tutor Agent (anak ngeluh susah/bosan)
    
    Tiap flag → Guardian kirim Telegram ke parent + rekomendasi aksi
    
  - **Intervention Tracking:**
    ```
    Setiap rekomendasi intervensi:
      ├── Simpan ke intervention_log
      ├── Trigger action: Content Agent bikin materi remedial / Scheduler adjust jadwal
      └── Follow-up di report berikutnya: "Minggu lalu direkomendasiin X, hasilnya Y"
    ```

  **C. Coordination Hub — Cross-Agent Orchestration**
  - Guardian bukan cuma report, tapi juga **trigger pipeline** dari kebutuhan parent:
    ```
    Parent request → Guardian evaluate:
      ├── "Anakku lemah di pecahan" → Assessment Agent (cek data) → Content Agent (scrape remedial) → Curriculum Agent (adjust urutan) → Scheduler Agent (prioritaskan)
      ├── "Tambahin materi tentang [X]" → Curriculum Agent (cek cocok grade?) → Content Agent (scrape) → Media Agent (bikin video)
      ├── "Anakku mau fokus UN" → Curriculum Agent (pilih topik prioritas UN) → Scheduler Agent (adjust jadwal intensif) → Content Agent (cari materi UN)
      ├── "Kok anakku gak pernah belajar?" → Scheduler Agent (cek jadwal) → Tutor Agent (cek chat log) → kirim insight ke parent
      └── "Anakku suka [hobi], gimana biar semangat?" → Content Agent (cari konten relatable) → Media Agent (custom character overlay) → Tutor Agent (adjust persona style)
    ```

  **D. Guardian Dashboard Data Provider**
  - Sediakan data untuk web dashboard parent:
    - Mastery trend chart (overall + per topik)
    - Weekly study time bar chart
    - Quiz/exam score history
    - Weak areas radar chart
    - Schedule adherence rate
    - Comparison: minggu ini vs minggu lalu vs target

- **Input:** Progress snapshots, WeakAreas, Schedule sessions, Assessment results, Tutor Agent feedback, parent messages
- **Output:** Guardian reports, intervention logs, admission records, cross-agent triggers
- **Depends on:** Assessment Agent (data performa), Scheduler Agent (jadwal + adherence), Tutor Agent (student feedback), Curriculum Agent (adjust urutan), Content Agent (remedial material)

#### Admission Flow Detail

```
Parent kirim "Tambah anak"
  │
  Guardian start admission:
  │
  ├── Step 1: Input data
  │   ├── Nama anak
  │   ├── Kelas (SD/5, SMP/1, SMA/2)
  │   ├── Telegram ID anak
  │   ├── Hobi / interests (opsional)
  │   └── Preferred schedule (opsional, default dipakai)
  │
  ├── Step 2: System setup (auto)
  │   ├── Pilih persona default: Kak Budi (SD), Kak Dewi (SMP), Kak Raka (SMA)
  │   ├── Set sched_config:
  │   │   ├── daily_time: "06:30", daily_duration: 15
  │   │   └── intensive_days: ["mon","wed","fri"], intensive_time: "16:00"
  │   ├── Init weak_areas (empty)
  │   └── Set enrollment active
  │
  ├── Step 3: Curriculum mapping
  │   ├── Curriculum Agent: generate list topik sesuai jenjang
  │   └── Scheduler Agent: assign topik minggu pertama
  │
  └── Step 4: Notification
      ├── Notif parent: "Andi sudah terdaftar! Kak Budi bakal nemenin belajar"
      └── Tutor Agent: kirim welcome ke anak
```

#### Performance Review & Intervention Flow

```
Setiap hari Minggu malam — Guardian Weekly Review:
  │
  ├── Collect data: ProgressSnapshot + WeakAreas + ScheduleSessions(week) + Attempts(week)
  │
  ├── Analyze per student:
  │   ├── [GREEN] Semua OK → simpan report, no action
  │   ├── [YELLOW] Ada penurunan → flag, notif parent mild
  │   │   └── Example: "Andi minggu ini cuma belajar 2x dari 7x jadwal"
  │   └── [RED] Kritis → trigger intervensi
  │       ├── Assessment Agent: remedial quiz
  │       ├── Content Agent: cari materi alternatif
  │       ├── Scheduler Agent: adjust jadwal
  │       ├── Tutor Agent: adjust approach (ganti gaya jelasin)
  │       └── Parent notif: rekomendasi detail + aksi yang diambil
  │
  └── Simpan intervention_log:<student_id, date, issue_type, severity, actions_taken, resolution_date>
```

### 7. Scheduler Agent

- **Role:** Atur jadwal belajar + reminder + motivasi mingguan. Assign topik ke slot harian + intensive berdasarkan priority kurikulum & weak areas.

- **Tanggung jawab:**

  **A. Topic Assignment Algorithm (Mingguan — Jumat malam / Sabtu)**
  - Input per student: curriculum_draft (priority order), weak_areas, progress_snapshots, sched_config
  - Mix logic buat milih topik minggu depan:

    ```
    Algorithm (weekly assignment):
      ├── Step 1: Collect candidates
      │   ├── New topics from curriculum draft (not yet studied)
      │   └── Weak areas topics (mastery < 50 — need review)
      │
      ├── Step 2: Filter by schedule capacity
      │   ├── Daily slots: 5x/minggu × 1 sub-topic = 5 sub-topik per minggu
      │   └── Intensive slots: 3x/minggu × 3-5 sub-topic = ~12 sub-topik
      │
      ├── Step 3: Priority mix
      │   ├── 60% topik baru (urutan dari curriculum_draft.week_N)
      │   ├── 30% weak areas review (lowest mastery first)
      │   └── 10% student request / random / topik pilihan bebas
      │
      └── Step 4: Assign ke slot
          ├── Daily (15 min): sub-topic ringan — intro + video + tanya singkat
          └── Intensive (3-4 jam): dalam — 3-5 sub-topik + mini-quiz tiap segmen
    ```

  **B. Daily vs Intensive Distribution**

  | Slot | Durasi | Assign | Format |
  |------|--------|--------|--------|
  | **Daily (06:30)** | 15 min | 1 sub-topic | Intro → Video → 1 pertanyaan → Selesai |
  | **Intensive (16:00)** | 3-4 jam | 3-5 sub-topik | Belajar 45min → Break 10min → Mini-quiz → Lanjut |
  - Daily tujuannya: **habit building**. Ringan, konsisten.
  - Intensive tujuannya: **deep learning**. Topik berat (rumus, konsep abstrak) di-dalemin.
  - Topik delivery="text" → cukup di daily (baca + quiz)
  - Topik delivery="video" → intensive (tonton video + diskusi + latihan)

  **C. Reminder System**

  ```
  Reminder timeline:
    │
    ├── H-1 (24 jam sebelumnya):
    │   └── Tutor: "Hey Andi! Besok intensif pecahan ya, siap-siap!"
    │
    ├── 30 menit sebelum:
    │   └── Tutor: "15 menit lagi belajar pecahan. Kak Budi udah siap! 🎉"
    │
    ├── Saat jadwal:
    │   └── Student join → sesi dimulai
    │
    ├── 5 menit setelah jadwal (kalo gak masuk):
    │   └── Tutor: "Andi, jadwal udah lewat nih. Mau diundur 1 jam?"
    │       ├── Student: "Iya" → reschedule otomatis
    │       └── Student: "Skip" → mark as missed, notif Guardian
    │
    └── End of day (kalo missed dan gak direschedule):
        └── Guardian notif: "[Anak] skip sesi [topik]. Total missed minggu ini: 3"
  ```

  **D. Reschedule Logic**

  ```
  Trigger: Student request ganti jadwal / Missed session
    │
    Scheduler evaluate:
    ├── Check: slot tersedia di 48 jam ke depan?
    │   ├── Ya → reschedule ke slot terdekat
    │   └── Tidak → cek lagi di 3 hari ke depan (pending)
    │
    ├── Balance check:
    │   ├── Kalau reschedule bikin 1 hari > 2 sesi → veto
    │   └── Kalau reschedule masih wajar → approve
    │
    └── Update schedule_sessions:
        ├── Status old session → "rescheduled"
        └── Create new session with new time
  ```

  **E. Student Override — Veto Logic**

  - Student: "Kak, aku gak mau belajar pecahan hari ini. Pengen bangun datar aja"
  - Scheduler cek:
    - Apakah progress pecahan udah cukup? (mastery > 60% → boleh skip)
    - Apakah bangun datar ada di jadwal minggu ini? (kalau ada → swap)
    - Total: kalau gak nganggu balance → approve swap
    - Kalau pecahan mastery masih 30% → veto: "Kak Budi sarankannya pecahan dulu ya, baru nanti bangun datar. Tapi janji besok kita main bangun datar! 🤝"

  **F. Weekly Motivation Video**

  - **Trigger:** Jumat malam (scheduled weekly)
  - **Content:** Recap minggu + praise + semangat minggu depan
    ```
    Script template:
      "Halo [nama]! [Karakter] di sini! Minggu ini lu belajar [N] topik!
      [Topik A]: mastery naik dari [X]% ke [Y]%! Mantap! 🔥
      [Topik B]: [Karakter] lihat lu masih agak susah ya. Gpp! 
      Minggu depan kita ulang pelan-pelan.
      
      Target minggu depan: [Topik C] + [Topik D].
      Siap? Gas!"
    ```
  - Render: Media Agent (30 detik, karakter student ngomong)
  - Upload YouTube unlisted → kirim link ke Telegram student + parent
  - **Storage:** Gak pake D-ID (mahal). Cukup slide + karakter overlay + TTS.

- **Input:** Schedule config (per student), WeakAreas, Curriculum draft, Progress snapshots, session feedback
- **Output:** Schedule sessions (planned), Reminder queue items, Reschedule proposals, Motivation video jobs
- **Depends on:** Curriculum Agent (topik priority order), Assessment Agent (weak areas → prioritas), Media Agent (motivation video render)
- **Queue Jobs:**
  - `scheduler:assign` — Cron mingguan (Jumat malam), assign next week topics
  - `scheduler:reminder` — Cron harian, kirim reminder schedule
  - `scheduler:motivation` — Cron mingguan (Jumat malam), trigger motivation video

## Web Dashboards

### A — Main Overview Dashboard (/dashboard)
Role: Admin/Parent — lihat semua anak sekaligus + status sistem

```
┌─────────────────────────────────────────────────────┐
│  AI Private Tutor — Dashboard Utama                  │
│  [👤 3 Students Active]  [⚠ 1 Intervention Active]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ SD Kelas 5   │  │ SMP Kelas 1  │  │ SMA Kelas 2  ││
│  │ 🟢 Andi      │  │ 🟡 Dewi      │  │ 🔴 Citra     ││
│  │ Belajar: 5/7  │  │ Belajar: 3/7  │  │ Belajar: 1/7  ││
│  │ Mastery: 72%  │  │ Mastery: 45%  │  │ Mastery: 80%  ││
│  │ Quiz avg: 80% │  │ Quiz avg: 55% │  │ Quiz avg: 88% ││
│  │ ➤ Detail     │  │ ➤ Detail     │  │ ⚠ Intervensi ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                      │
│  Pipeline Status                                     │
│  📥 Content Queue: 3 pending                         │
│  🎬 Media Queue: 2 processing, 1 pending             │
│  📝 Assessment Queue: 0 pending                      │
│                                                      │
│  Alert Terbaru                                       │
│  [1 jam] Dewi: mastery pecahan stuck di 35% — lihat  │
│  [3 jam] Citra: 3 hari berturut skip jadwal — lihat  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Halaman:**
| Route | Isi |
|-------|-----|
| `/dashboard` | Card per student (3 kolom) + pipeline status + alerts |
| `/student/[id]` | Detail 1 anak (lihat di Student Dashboard) |
| `/agents` | Status tiap agent: queue depth, last action, errors |
| `/settings` | Config global: model provider, scraping sources, jadwal default |

### B — Student Dashboard (/student/[id])
Role: Student — akses materi, quiz, progress individu (selain Telegram)

```
┌─────────────────────────────────────────────────────┐
│  Halo, Andi! 🤖 Kak Budi — Mode: Kak Budi           │
│  [📚 Materi]  [📝 Quiz]  [📊 Progress]  [⚙ Settings]│
├─────────────────────────────────────────────────────┤
│                                                      │
│  Lanjut Belajar                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ Pecahan Sederhana — Matematika SD5              ││
│  │ [████████░░░░░░] 65% — Mastery: 72% ↗          ││
│  │ ➤ Lanjutkan → /materi/[id]                     ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Jadwal Hari Ini (30 menit)                          │
│  │ Pecahan — 06:30 (15 menit) ✅ selesai             │
│  │ Quiz Pecahan — 16:00 (15 menit) ⏳ nanti sore     │
│                                                      │
│  Topik Pekan Ini                                     │
│  │ Sen ✅│ Sel ✅│ Rab ⏳│ Kam ⏳│ Jum ⏳│             │
│                                                      │
│  Ringkasan Progress                                  │
│  ┌──────────┬──────────┬──────────┬──────────┐       │
│  │ Topik    │ Mastery  │ Quiz     │ Attempt  │       │
│  ├──────────┼──────────┼──────────┼──────────┤       │
│  │ Pecahan  │ 72% ↗    │ 80%      │ 3        │       │
│  │ Bangun   │ 45% ↗    │ 60%      │ 1        │       │
│  │ …        │ …        │ …        │ …        │       │
│  └──────────┴──────────┴──────────┴──────────┘       │
│                                                      │
│  Video Hari Ini — "Kak Budi Ajarin Pecahan" 🎬       │
│  [▶ Putar]  [📥 Download Ringkasan]                  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Halaman Student:**
| Route | Isi |
|-------|-----|
| `/student/[id]` | Dashboard pribadi: lanjut belajar, jadwal, progress ringkasan |
| `/student/[id]/materi` | List semua topik per mapel — filter by status (baru/dipelajari/kuasai) |
| `/student/[id]/materi/[materialId]` | Detail materi: teks ringkasan + video YouTube + tombol "Mulai Quiz" |
| `/student/[id]/quiz` | Riwayat quiz + exam + "Quiz Baru" button |
| `/student/[id]/quiz/[quizId]` | Kerjakan quiz (1 halaman atau step-by-step) |
| `/student/[id]/progress` | Grafik mastery trend, radar weak areas, stat waktu belajar |
| `/student/[id]/jadwal` | Kalender jadwal + request reschedule |

### C — Parent/Guardian Dashboard (/guardian/[studentId])
Role: Parent — monitor 1 anak (lengkap)

| Route | Isi |
|-------|-----|
| `/guardian` | List anak — pilih salah satu |
| `/guardian/[studentId]` | Dashboard 1 anak: mastery trend chart, weekly study time bar, quiz avg history, weak areas radar, schedule adherence |
| `/guardian/[studentId]/report` | Weekly/monthly report detail |
| `/guardian/[studentId]/interventions` | Riwayat intervensi + status |
| `/guardian/admission` | Tambah anak baru (form) |
| `/guardian/settings` | Config per anak: jadwal, persona override, notifikasi |

#### Guardian Dashboard Page Detail (/guardian/[studentId])

```
┌─────────────────────────────────────────────────────┐
│  Dashboard — Dewi (SMP Kelas 1) 🟡                  │
│  [📊 Ringkasan]  [📋 Report]  [⚠ Intervensi]  [⚙]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────── Ringkasan ───────────────────────────────┐│
│  │ Waktu belajar minggu ini: 2.5 jam (target: 7 jam)│ │
│  │ Quiz avg: 55%  │  Mastery overall: 45%           ││
│  │ Sesi attended: 3/7  │  Sesi missed: 4            ││
│  │ Status: 🟡 Perlu perhatian                       ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  ┌─────── Weak Areas ──────────────────────────────┐│
│  │ Pecahan          ████████░░░░  35%  ⚠ stuck      ││
│  │ Persamaan Linear ██████████░░  50%  ↗            ││
│  │ Bangun Datar     ████████████  60%  ↗            ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  ┌─────── Mastery Trend (30 hari) ─────────────────┐│
│  │ [Grafik garis: naik turun]                       ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  ┌─────── Intervensi Aktif ────────────────────────┐│
│  │ ⚠ Pecahan stuck 35% > 2 minggu                  ││
│  │   → Content Agent cari materi remedial ✅       ││
│  │   → Scheduler tambah jadwal pecahan ⏳          ││
│  │   → Tutor Agent: "Kak Dewi: Ajarin pake analogi ││
│  │     pizza biar lebih gampang" 🔄 recommend       ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Auth Flow
- **Parent:** Login via email/password — lihat semua anak. Bisa invite parent lain (pasangan).
- **Student:** Login via Telegram OTP — enter Telegram ID → dapat OTP di bot → masuk web.
- **Roles:** `parent` (full access) | `student` (own data only)

### API Routes — tambahan web-specific
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/auth/login` | POST | Email+password parent / OTP student |
| `/api/auth/telegram-otp` | POST | Minta OTP via bot |
| `/api/students` | GET | List siswa (parent) |
| `/api/students/[id]/progress` | GET | Progress snapshot + trend |
| `/api/students/[id]/weak-areas` | GET | Weak areas list + rekomendasi |
| `/api/students/[id]/schedule` | GET | Jadwal minggu ini |
| `/api/students/[id]/interventions` | GET | Intervention log |
| `/api/materials` | GET | List materi, filter by grade/topic/status |
| `/api/materials/[id]/quiz` | GET | Quiz untuk materi ini |
| `/api/quiz/[id]/submit` | POST | Submit jawaban quiz |
| `/api/guardian/report` | GET | Generate weekly report (JSON) |
| `/api/agents/status` | GET | Status tiap agent (queue depth, last run) |

## Tech Stack
- **Frontend & API:** Next.js (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Queue:** BullMQ + Redis
- **Telegram Bot:** Telegraf.js (webhook mode)
- **AI/LLM:** OpenAI SDK
- **Media Generation:** FFmpeg + React-Motion / Remotion (?)
- **Auth:** NextAuth.js
- **Deployment (final):** Docker + VPS
- **Lokal:** Docker Compose (PostgreSQL + Redis + App)

## Directory Structure
```
ai-private-tutor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (web)/              # Web pages
│   │   │   ├── login/
│   │   │   ├── dashboard/      # Main overview
│   │   │   ├── student/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── materi/[materialId]/
│   │   │   │   │   ├── quiz/[quizId]/
│   │   │   │   │   ├── progress/
│   │   │   │   │   └── jadwal/
│   │   │   └── guardian/
│   │   │       ├── [studentId]/
│   │   │       │   ├── report/
│   │   │       │   └── interventions/
│   │   │       ├── admission/
│   │   │       └── settings/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── materials/
│   │   │   ├── quiz/
│   │   │   ├── guardian/
│   │   │   └── agents/
│   │   └── telegram/           # Webhook handler
│   ├── agents/
│   │   ├── curriculum/
│   │   ├── content/
│   │   ├── media/
│   │   ├── assessment/
│   │   ├── tutor/
│   │   ├── guardian/
│   │   └── scheduler/
│   ├── lib/
│   │   ├── prisma/
│   │   ├── openai/
│   │   ├── queue/
│   │   └── auth/
│   └── types/
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
├── package.json
├── .env.example
└── docs/designs/
```

## Model Strategy

Per-agent routing via OpenRouter. Filosofi: pake model murah untuk frekuensi tinggi, model bagus untuk kualitas kritis.

### Per-Agent Model Routing

| Agent | Rekomendasi | OpenRouter ID | Kenapa |
|-------|------------|--------------|--------|
| **Tutor** (chat) | Gemini 2.0 Flash | `google/gemini-2.0-flash-001` | Fast, murah, jutaan token/hari. Vision support buat foto |
| **Tutor** (vision) | Gemini 2.0 Flash | `google/gemini-2.0-flash-001` | Vision built-in, rate lumayan |
| **Curriculum** (draft) | DeepSeek V3 | `deepseek/deepseek-chat` | Sekali generate per student, murah |
| **Content** (cleaning) | Gemini 1.5 Flash | `google/gemini-1.5-flash` | Cuma cleanse text, gak perlu pinter |
| **Assessment** (quiz gen) | GPT-4o-mini | `openai/gpt-4o-mini` | Soal harus akurat, mid-range |
| **Assessment** (evaluate) | Gemini 2.0 Flash | `google/gemini-2.0-flash-001` | Koreksi sederhana, gak perlu mahal |
| **Guardian** (report) | DeepSeek V3 | `deepseek/deepseek-chat` | Batch weekly, murah per token |
| **Scheduler** (logic) | **No LLM** | — | Algorithmic. Kode aja cukup |
| **Media** (script) | Claude Sonnet | `anthropic/claude-3.5-sonnet` | Script quality penting, tapi frekuensi rendah |
| **Media** (TTS) | Edge TTS | — | Free, no API cost |

### Fallback Chain

```yaml
# Per-agent fallback — kalau primary down / rate limited
fallback_order:
  - primary: "openrouter/google/gemini-2.0-flash-001"
  - fallback_1: "openrouter/openai/gpt-4o-mini"
  - fallback_2: "openrouter/deepseek/deepseek-chat"
  - fallback_3: "openrouter/meta-llama/llama-3-70b-instruct"
```

### Cost Estimasi Bulanan (3 siswa, asumsi pemakaian normal)

| Agent | Token/bln | Model | Biaya |
|-------|-----------|-------|-------|
| Tutor (chat) | ~5M token | Gemini Flash $0.075/M | ~$0.38 |
| Tutor (vision) | ~500K | Gemini Flash $0.15/M | ~$0.08 |
| Curriculum | ~100K | DeepSeek $0.27/M | ~$0.03 |
| Content | ~200K | Gemini 1.5 Flash $0.075/M | ~$0.02 |
| Assessment (gen) | ~300K | GPT-4o-mini $0.15/M | ~$0.05 |
| Assessment (eval) | ~200K | Gemini Flash $0.075/M | ~$0.02 |
| Guardian | ~100K | DeepSeek $0.27/M | ~$0.03 |
| Media (script) | ~100K | Claude Sonnet $3/M | ~$0.30 |
| **Total** | ~6.5M | | **~$0.91/bln** |

> Estimasi kasar — real cost tergantung frekuensi chat & jumlah materi yang diproses.
> Budget < $5/bln is very achievable.

### Config (OpenRouter)

```yaml
# openrouter.yaml
provider_routing:
  default: "openrouter/google/gemini-2.0-flash-001"
  overrides:
    tutor: "openrouter/google/gemini-2.0-flash-001"
    curriculum: "openrouter/deepseek/deepseek-chat" 
    assessment_gen: "openrouter/openai/gpt-4o-mini"
    media_script: "openrouter/anthropic/claude-3.5-sonnet"
    
fallback:
  enabled: true
  max_retries: 3
  backoff: linear_5s
  
rate_limits:
  scrape_domains: 5 req/min per domain
  render_queue: 1 concurrent
```

## Risk & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Content scraping unreliable (web sekolah down/blocked) | Medium | Fallback 3+ sumber, manual input panel, flag partial_content |
| Web scraping kena rate limit / CAPTCHA | Medium | Queue dengan delay (5 req/min/domain), rotate user-agent |
| Video rendering CPU/GPU overload | High | Queue max 1 concurrent, render priority (week_1 dulu), fallback YouTube reference |
| LLM hallucination di script video | Medium | Script review oleh Curriculum Agent sebelum render |
| LLM generate quiz dengan jawaban salah | Medium | Validasi soal: cek apakah jawaban ada di processed_content |
| Student gak punya Telegram | Low | Web dashboard sebagai primary, Telegram sebagai opsi |
| Student skip belajar terus (demotivasi) | Medium | Scheduler reschedule + gentle reminder → eskalasi Guardian → parent notif |
| 3 persona susah dibedakan (tutor ngaco) | Low | System prompt strict per persona + session context injection |
| Edge TTS suara Indonesia terbatas | Low | Pake voice "ID-ArdiNeural" (male) / "ID-GadisNeural" (female). Kalo karakter butuh EN voice, pake EN. |
| YouTube API quota limit | Medium | Batch upload, prioritaskan queue. 1 akun = 10k units/day — cukup buat 10-20 video/hari |
| Redis down / queue failure | High | Queue job persist di PostgreSQL (fallback), BullMQ reconnect auto |
| Parent lupa password / gak bisa login | Low | Telegram OTP sebagai alternative login |
| Database migration error | Medium | Prisma migrate dev di lokal dulu, baru prod. Snapshot before migrate. |
| Student data privacy | Medium | No external data sharing. Video unlisted. DB encrypted at rest. |
