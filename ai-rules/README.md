# ai-rules/ — Master Template untuk AI Private Tutor

> **Status:** IMMUTABLE — AI TIDAK BOLEH mengubah file apapun di folder ini.
> **Purpose:** Semua panduan, aturan, dan template yang dibutuhkan AI untuk bekerja.

## Cara Pakai AI

1. **PERTAMA KALI:** Baca `AGENTS.md` di folder ini
2. Baca file ini untuk memahami struktur ai-rules
3. Setiap kali butuh aturan: cari di sub-folder yang sesuai
4. Setiap kali butuh buat output: cari template di kolom "Template Source"

## Mapping: Template → Output

### Folder Output: `dev-docs/ai/`

| File Output | Template Source | Keterangan |
|-------------|----------------|------------|
| `dev-docs/ai/START_HERE.md` | `ai-rules/dev-docs-ai-templates/START_HERE-template.md` | Entry point AI agent |
| `dev-docs/ai/PROJECT_CONTEXT.md` | `ai-rules/dev-docs-ai-templates/PROJECT_CONTEXT-template.md` | System overview |
| `dev-docs/ai/MODULE_MAP.md` | `ai-rules/dev-docs-ai-templates/MODULE_MAP-template.md` | Module-to-code mapping |
| `dev-docs/ai/MODULE_MAP.md` | `ai-rules/dev-docs-ai-templates/AGENTS-template.md` | AI agent contract |
| `dev-docs/ai/CURRENT_STATE.md` | `ai-rules/dev-docs-ai-templates/CURRENT_STATE-template.md` | Current dev state |
| `dev-docs/ai/FINAL_SYSTEM_HANDOVER.md` | `ai-rules/dev-docs-ai-templates/FINAL_SYSTEM_HANDOVER-template.md` | Handover doc |
| `dev-docs/ai/DOCS_MIGRATION_REPORT.md` | `ai-rules/migration/_OLD_DOCS_AUDIT_TEMPLATE.md` | Migration audit report |

### Folder Output: `dev-docs/architecture/`

| File Output | Template Source | Keterangan |
|-------------|----------------|------------|
| `dev-docs/architecture/api-flow.md` | `ai-rules/architecture-templates/api-flow.md` | API flow diagram |
| `dev-docs/architecture/database.md` | `ai-rules/architecture-templates/database.md` | Database schema |
| `dev-docs/architecture/frontend-structure.md` | `ai-rules/architecture-templates/frontend-structure.md` | Frontend structure |
| `dev-docs/architecture/backend-structure.md` | `ai-rules/architecture-templates/backend-structure.md` | Backend structure |

### Folder Output: `dev-docs/modules/`

| File Output | Template Source | Keterangan |
|-------------|----------------|------------|
| `dev-docs/modules/tutor-agent/*` | `ai-rules/modules-template/_template/*` | Tutor Agent docs |
| `dev-docs/modules/curriculum-agent/*` | `ai-rules/modules-template/_template/*` | Curriculum Agent docs |
| `dev-docs/modules/content-agent/*` | `ai-rules/modules-template/_template/*` | Content Agent docs |
| `dev-docs/modules/assessment-agent/*` | `ai-rules/modules-template/_template/*` | Assessment Agent docs |
| `dev-docs/modules/media-agent/*` | `ai-rules/modules-template/_template/*` | Media Agent docs |
| `dev-docs/modules/guardian-agent/*` | `ai-rules/modules-template/_template/*` | Guardian Agent docs |
| `dev-docs/modules/scheduler-agent/*` | `ai-rules/modules-template/_template/*` | Scheduler Agent docs |

### Folder Output: `prod-docs/`

| File Output | Template Source | Keterangan |
|-------------|----------------|------------|
| `prod-docs/AGENTS.md` | `ai-rules/prod-docs-templates/AGENTS.md` | Kontrak AI di server |
| `prod-docs/README.md` | `ai-rules/prod-docs-templates/README.md` | Panduan penggunaan |
| `prod-docs/docs/architecture/overview.md` | `ai-rules/prod-docs-templates/docs/architecture/overview.md` | Server architecture |
| `prod-docs/docs/operations/*` | `ai-rules/prod-docs-templates/docs/operations/*` | Server operations |

## Aturan Emas

1. **AI TIDAK BOLEH mengubah file apapun di `ai-rules/`** — baca, jangan tulis
2. **AI WAJIB membuat folder output** saat pertama kali dibutuhkan
3. **AI WAJIB membaca template** dari `ai-rules/` sebelum membuat/mengupdate file output
4. **Output folder TETAP di PROJECT ROOT** — paralel dengan `ai-rules/` dan folder kode (`src/`)
5. **Jika ragu, baca ulang template di `ai-rules/`** — template SELALU utuh
