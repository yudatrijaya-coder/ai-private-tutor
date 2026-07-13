export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">🏗️ Arsitektur</h1>
        <p className="text-lg text-slate-600 mb-8">
          AI Private Tutor menggunakan arsitektur <strong>monolithic Next.js</strong> dengan <strong>7 agent terintegrasi</strong>.
        </p>

        <Section title="Tech Stack">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Layer</th>
                <th className="p-2 text-left border">Teknologi</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Frontend', 'Next.js 16 + Tailwind CSS 4'],
                ['Backend', 'Next.js API Routes + Prisma ORM'],
                ['Database', 'SQLite (dev) / PostgreSQL (prod)'],
                ['Queue', 'BullMQ + Redis / In-memory fallback'],
                ['Bot', 'Telegraf.js (Telegram)'],
                ['LLM', '9Router combo / SumoPod / fallback chain'],
              ] as const).map(([layer, tech]) => (
                <tr key={layer}>
                  <td className="p-2 border font-medium">{layer}</td>
                  <td className="p-2 border">{tech}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="7 Agent System">
          <p className="mb-6">
            AI Private Tutor menggunakan 7 agen AI yang saling terintegrasi dengan pipeline sebagai berikut:
          </p>

          {/* ASCII Agent Relationship Diagram */}
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-8 leading-relaxed">
{`    Guardian ──→ admit student ──→ Curriculum
        ↑                                │
        │                       draft topics │
        │                                ▼
        │                             Content
        │                                │
        │                       scraped material │
        │                                ▼
        │                          Assessment
        │                           │       │
        │                    ┌──────┘       └──────┐
        │                    ▼                      ▼
        │                  Tutor                 Media ──→ YouTube
        │                    │
        │                    │
        ├── weekly report ───┤
        │                    │
        │              Scheduler ──→ reminders ──→ Tutor
        │
        Parent           Student`}
          </pre>

          <div className="space-y-6">
            {/* 1. Tutor Agent */}
            <AgentCard
              emoji="🤖"
              name="Tutor Agent"
              description="Interface utama via Telegram — chat, quiz, vision (foto soal)."
              details={[
                '3 persona berbeda sesuai jenjang:',
                '  • Kak Budi (SD) — playful dan penuh semangat',
                '  • Kak Dewi (SMP) — santai dan suportif',
                '  • Kak Raka (SMA) — formal dan akademis',
                'Menerima chat text, quiz interaktif, dan foto soal (vision).',
                'Memberikan motivasi belajar mingguan ke student.',
              ]}
            />

            {/* 2. Curriculum Agent */}
            <AgentCard
              emoji="📚"
              name="Curriculum Agent"
              description="Generate & finalisasi kurikulum per student sesuai Kurikulum Merdeka."
              details={[
                'Menentukan topik, sub-topik, dan urutan belajar.',
                'Menetapkan priority mingguan berdasarkan assessment.',
                'Bekerja sama dengan Content Agent untuk verifikasi materi.',
                'Review dan update kurikulum secara periodik.',
              ]}
            />

            {/* 3. Content Agent */}
            <AgentCard
              emoji="📄"
              name="Content Agent"
              description="Scrape materi dari internet, extract & clean konten pembelajaran."
              details={[
                'Multi-source fallback — kalau 1 sumber gagal, coba sumber lain.',
                'Scrape per priority — hemat bandwidth, student butuh week_1 dulu.',
                'Extract teks bersih dari halaman web dan PDF.',
                'Format konten untuk quiz generation dan study session.',
              ]}
            />

            {/* 4. Assessment Agent */}
            <AgentCard
              emoji="📝"
              name="Assessment Agent"
              description="Generate quiz/exam otomatis dari materi. Koreksi jawaban & track weak areas."
              details={[
                'Generate soal otomatis dari materi yang sudah diproses.',
                'Koreksi jawaban siswa secara real-time.',
                'Track weak areas & mastery level per topik.',
                'Adaptive difficulty — soal menyesuaikan level siswa.',
                'Update Guardian Agent dengan progress terbaru.',
              ]}
            />

            {/* 5. Media Agent */}
            <AgentCard
              emoji="🎬"
              name="Media Agent"
              description="Generate video pembelajaran dengan karakter favorit."
              details={[
                'Mendukung karakter favorit: Mbappe, Lisa BLACKPINK, dan lainnya.',
                'Upload ke YouTube (unlisted) — tidak simpan video di server.',
                'Fallback ke YouTube reference sementara jika render gagal.',
                'Video hanya untuk topik visual — text lebih cepat untuk topik teoritis.',
              ]}
            />

            {/* 6. Guardian Agent */}
            <AgentCard
              emoji="👨‍👩‍👧"
              name="Guardian Agent"
              description="Admission siswa baru, weekly report untuk ortu, early warning system."
              details={[
                'Proses pendaftaran dan admission siswa baru.',
                'Weekly report untuk orang tua — progress, weak areas, partisipasi.',
                'Early warning system — notifikasi jika ada masalah (tidak belajar, nilai turun).',
                'Monitoring multiple students per orang tua.',
              ]}
            />

            {/* 7. Scheduler Agent */}
            <AgentCard
              emoji="⏰"
              name="Scheduler Agent"
              description="Atur jadwal harian & intensif. Reminder & reschedule otomatis."
              details={[
                'Jadwal harian: sesi 15 menit untuk belajar konsisten.',
                'Jadwal intensif: 3-4 jam untuk persiapan ujian.',
                'Reminder otomatis via Telegram.',
                'Reschedule otomatis jika student miss sesi.',
                'Motivasi mingguan terjadwal.',
              ]}
            />
          </div>
        </Section>

        <Section title="Queue Architecture">
          <p className="mb-4">
            Semua tugas agent diproses melalui BullMQ queue pipeline dengan in-memory fallback jika Redis tidak tersedia.
          </p>

          {/* ASCII Queue Pipeline Diagram */}
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-6 leading-relaxed">
{`                    ┌──────────────┐
                    │ Dead Letter  │
                    │    Queue     │
                    └──────┬───────┘
                           │ failed jobs
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   content:scrape ──► curriculum:review ──► assessment:generate
                                             │
                                             ├──► assessment:evaluate
                                             │
                                             └──► media:render`}
          </pre>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Queue</th>
                <th className="p-2 text-left border">Worker</th>
                <th className="p-2 text-left border">Concurrency</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['curriculum:generate', 'Curriculum Agent', '2'],
                ['content:scrape', 'Content Agent', '2'],
                ['curriculum:review', 'Curriculum Agent', '2'],
                ['media:render', 'Media Agent', '1'],
                ['assessment:generate', 'Assessment Agent', '3'],
                ['assessment:evaluate', 'Assessment Agent', '5'],
                ['guardian:report', 'Guardian Agent', '1'],
                ['scheduler:assign', 'Scheduler Agent', '1'],
                ['scheduler:reminder', 'Scheduler Agent', '10'],
              ] as const).map(([queue, worker, concurrency]) => (
                <tr key={queue}>
                  <td className="p-2 border font-mono text-sm">{queue}</td>
                  <td className="p-2 border">{worker}</td>
                  <td className="p-2 border text-center">{concurrency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Database Schema">
          <p className="mb-4">
            Berikut adalah entity relationship diagram untuk model data utama:
          </p>

          {/* ASCII ER Diagram */}
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-6 leading-relaxed">
{`  Student ──╫──┐
     │        │  has
     │        ├── Curriculum ──╫── Material
     │        │                    │
     │        │               has  │
     │        │                    ▼
     │        │                  Quiz ──╫── Attempt
     │        │                             │
     │  takes ┘                             │
     │                                      │
     ├────────────────── makes ─────────────┘
     │
     ├── SessionState (1-to-1)
     │
     ├── ProgressSnap (tracks progress)
     │
     ├── Intervention (monitors flags)
     │
     └── ScheduleSession (schedules)`}
          </pre>

          <p className="text-sm text-slate-500 italic">
            Key: ╫ = one-to-many, ──╫── = one side of one-to-many, ── = one-to-one
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <EntityCard
              name="Student"
              fields={['id', 'name', 'grade (SD/SMP/SMA)', 'guardianId', 'persona']}
            />
            <EntityCard
              name="Curriculum"
              fields={['id', 'studentId', 'topic', 'subTopic', 'priority', 'status']}
            />
            <EntityCard
              name="Material"
              fields={['id', 'curriculumId', 'url', 'content', 'source', 'status']}
            />
            <EntityCard
              name="Quiz"
              fields={['id', 'materialId', 'questions (JSON)', 'difficulty', 'maxAttempts']}
            />
            <EntityCard
              name="Attempt"
              fields={['id', 'quizId', 'studentId', 'answers (JSON)', 'score', 'weakAreas']}
            />
            <EntityCard
              name="SessionState"
              fields={['id', 'studentId', 'currentAgent', 'context (JSON)', 'step']}
            />
            <EntityCard
              name="ScheduleSession"
              fields={['id', 'studentId', 'type (daily/intensive)', 'time', 'duration']}
            />
            <EntityCard
              name="ProgressSnap"
              fields={['id', 'studentId', 'masteryLevel', 'metrics (JSON)', 'snapshotAt']}
            />
          </div>
        </Section>

        <Section title="Data Flow">
          <p className="mb-4">
            Alur data end-to-end dari admission hingga laporan orang tua:
          </p>

          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed">
{`Guardian ──► admit student
    │
    ▼
Curriculum ──► draft topics per grade
    │
    ▼
Content ──► scrape material dari internet
    │
    ▼
Assessment ──► generate quiz dari materi
    │
    ▼
Tutor ◄── chat & quiz interaktif
    │
    ▼
Scheduler ──► reminder & jadwal harian`}
          </pre>
        </Section>

        <Section title="Agent Pipeline Flow">
          <p className="mb-4">
            Sequence diagram interaksi antar agent saat student baru mendaftar:
          </p>

          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed">
{`Guardian     Curriculum   Content    Assessment   Media    Tutor   Scheduler
   │              │           │            │         │        │        │
   │── admit ──►  │           │            │         │        │        │
   │              │           │            │         │        │        │
   │              │── draft ─►│            │         │        │        │
   │              │           │            │         │        │        │
   │              │           │── proc ──►│         │        │        │
   │              │           │   content  │         │        │        │
   │              │           │            │         │        │        │
   │              │           │            │── gen ─►│        │        │
   │              │           │            │  quiz   │        │        │
   │              │           │            │         │        │        │
   │              │           │            │◄─ submit ────►│        │
   │              │           │            │  answers │        │        │
   │              │           │            │         │        │        │
   │◄─ update ────┤           │            │         │        │        │
   │   weak areas │           │            │         │        │        │
   │              │           │            │         │        │        │
   │              │           │            │         │        │  remind│
   │              │           │            │         │        │◄───────│
   │              │           │            │         │        │        │`}
          </pre>
        </Section>

        <Section title="🧠 Mindmap — Premium Interactive Learning">
          <p className="mb-3">
            Fitur flagship berbasis <strong>React Flow</strong> untuk visualisasi topik belajar secara interaktif.
            Tersedia di <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">/student/mindmap/[subject]</code>.
          </p>

          <h3 className="font-semibold text-slate-800 mb-2">Key Features</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-700 mb-4">
            <li><strong>Radial quadrant layout</strong> — branches evenly spaced 360°, leaves radiate outward from parent branch direction</li>
            <li><strong>Lucide icons</strong> per node — auto-resolved via <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">iconMap.ts</code></li>
            <li><strong>Per-icon CSS animations</strong> — floating, wiggling, spinning, pulsing personality per node</li>
            <li><strong>4 directional handles</strong> per node — computed dynamically via <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">angleDir()</code></li>
            <li><strong>3-level hierarchy:</strong> center (gold glow + pulse), branch (solid border, float), leaf (solid border)</li>
            <li><strong>SD/SMP/SMA theming</strong> — roundedness, padding, font, shadow intensity per jenjang</li>
            <li><strong>Background</strong> — pastel gradient blobs (SVG radial gradients)</li>
          </ul>

          <h3 className="font-semibold text-slate-800 mb-2">Component Architecture</h3>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4 leading-relaxed">
{`src/
├── app/(student)/student/mindmap/[subject]/
│   ├── ReactFlowMindmap.tsx   # Main — layout, edges, ReactFlow wrapper
│   └── page.tsx               # Parse markdown → mindmap nodes
├── components/mindmap/
│   ├── CustomNode.tsx         # Node render — icons, themes, animations
│   ├── iconMap.ts             # Topic name → Lucide icon resolver
│   └── animMap.ts             # Per-icon CSS animation definitions
└── lib/mindmap-template.ts    # parseMindmapFromMarkdown() utility`}
          </pre>

          <h3 className="font-semibold text-slate-800 mb-2">Template Format</h3>
          <p className="mb-2 text-sm text-slate-600">Content dari slide markdown otomatis diparse:</p>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-2 leading-relaxed">{`## Sistem Tata Surya
- Planet dalam (Merkurius, Venus, Bumi, Mars)
- Planet luar (Jupiter, Saturnus, Uranus, Neptunus)
- Asteroid dan Komet

## Gerhana
- Gerhana Matahari
- Gerhana Bulan`}</pre>

          <div className="grid gap-3 sm:grid-cols-2">
            <DataCard title="Layout Algorithm" items={['Radial — no dagre', '360° even branch spread', '70% wedge utilization', 'Multi-ring leaf distance']} />
            <DataCard title="Animation Types" items={['centerPulse — gold glow', 'floatGentle — branch sway', 'wiggle — playful icons', 'spinSlow — technology icons']} />
          </div>
        </Section>

        <Section title="📝 Quiz Bank & Exam Generator">
          <p className="mb-3">
            Bank soal statis berisi <strong>1650 soal</strong> yang digenerate otomatis menggunakan 9Router LLM dari data kurikulum SIBI.
          </p>

          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Jenjang</th>
                <th className="p-2 text-left border">Entries</th>
                <th className="p-2 text-left border">Total Soal</th>
                <th className="p-2 text-left border">File</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['SD Kelas 5', '108', '~540', 'src/data/quiz-bank-sd5.ts'],
                ['SMP Kelas 1', '99', '~495', 'src/data/quiz-bank-smp7.ts'],
                ['SMA Kelas 2', '123', '~615', 'src/data/quiz-bank-sma11.ts'],
              ] as const).map(([jenjang, entries, total, file]) => (
                <tr key={jenjang}>
                  <td className="p-2 border font-medium">{jenjang}</td>
                  <td className="p-2 border text-center">{entries}</td>
                  <td className="p-2 border text-center">{total}</td>
                  <td className="p-2 border font-mono text-xs">{file}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-semibold text-slate-800 mb-2">Exam Generator</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-700 mb-3">
            <li><strong>Template-based</strong> — auto-generate dari weekly timeline di <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">/dashboard/quizzes/exam/template</code></li>
            <li><strong>Endpoints:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">/api/exam</code> dan <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">/api/exam/template</code></li>
            <li>Quiz detail page di <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">/dashboard/quizzes/[id]</code></li>
            <li>Seed data: ada di <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">scripts/seed.ts</code> + backup via Telegram</li>
          </ul>

          <h3 className="font-semibold text-slate-800 mb-2">Batch Mindmap Generator</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-700 mb-3">
            <li><strong>Endpoint:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">POST /api/curriculum/batch-mindmap</code> — generate mindmap data dari slides yang sudah ada</li>
            <li>Parse slides markdown (metadata.slides) menjadi node data untuk ReactFlow mindmap</li>
            <li>Mendukung 3 format: <code>## headers</code>, bullet list (<code>-</code>, <code>•</code>), dan numbered list (<code>1.</code>)</li>
            <li>Hasil disimpan di <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">metadata.mindmap</code> tiap Material</li>
            <li>3 murid sudah digenerate: 108 + 99 + 123 = <strong>330 mindmaps, 2.414 leaf nodes</strong></li>
          </ul>
        </Section>

        <Section title="📚 Curriculum SIBI 2026/2027">
          <p className="mb-3">
            Kurikulum dari PDF resmi Kemendikdasmen melalui SIBI (Sistem Informasi Perbukuan Indonesia).
          </p>

          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Jenjang</th>
                <th className="p-2 text-left border">Topics</th>
                <th className="p-2 text-left border">Source</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['SD Kelas 5', '~30 topics', 'PDF resmi Kemendikdasmen'],
                ['SMP Kelas 1', '~30 topics', 'SIBI Kemendikdasmen'],
                ['SMA Kelas 2', '~35 topics', 'SIBI Kemendikdasmen'],
              ] as const).map(([jenjang, topics, source]) => (
                <tr key={jenjang}>
                  <td className="p-2 border font-medium">{jenjang}</td>
                  <td className="p-2 border">{topics}</td>
                  <td className="p-2 border text-slate-600">{source}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-slate-700 mb-2">
            Setiap topic mencakup: subject, sub-topics lengkap dengan deskripsi, urutan prioritas belajar, dan referensi sumber.
            Ditampilkan dengan <strong>PaginatedTable</strong> di halaman curriculum dashboard.
          </p>
        </Section>

        <Section title="🔌 SIBI API — Cara Download PDF Buku">
          <p className="mb-3">
            API publik SIBI (Sistem Informasi Perbukuan Indonesia) untuk mencari dan download PDF buku.
            endpoint: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">https://api.buku.cloudapp.web.id</code>
          </p>
          <p className="text-slate-700 mb-3">
            <strong>Flow:</strong> Search → dapat slug → detail → attachment URL → download.
            Gak perlu pake browser, cukup 2x curl.
          </p>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Endpoint</th>
                <th className="p-2 text-left border">Contoh</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['GET /api/catalogue/search?q={keyword}', 'curl .../search?q=Ekonomi+SMA+XI'],
                ['GET /api/catalogue/getDetails?slug={slug}', 'curl .../getDetails?slug=ekonomi-...'],
                ['GET /api/catalogue/getBooksByTag?tag=STEM', 'curl .../getBooksByTag?tag=STEM'],
              ] as const).map(([endpoint, example]) => (
                <tr key={endpoint}>
                  <td className="p-2 border font-mono text-sm">{endpoint}</td>
                  <td className="p-2 border text-sm text-slate-600">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-slate-700">
            Field <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">attachment</code> dari response detail adalah URL PDF langsung.
            CDN: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">https://static-sc.cloudapp.web.id</code>.
            Dokumentasi lengkap ada di <strong>sibi-api</strong> skill Hermes.
          </p>
        </Section>

        <Section title="🎬 YouTube Learning Resources">
          <p className="mb-3">
            Video pembelajaran edukatif yang dikurasi dari YouTube untuk setiap jenjang, terverifikasi via oEmbed API. Tampil per-topik di halaman student.
          </p>
          <table className="w-full mb-3">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Jenjang</th>
                <th className="p-2 text-left border">Jumlah Video</th>
                <th className="p-2 text-left border">File</th>
              </tr>
            </thead>
            <tbody>
              {([
                ["SD Kelas 5", "28 video", "youtube.ts"],
                ["SMP Kelas 1", "91 video", "youtube-smp7.ts"],
                ["SMA Kelas 2", "113 video", "youtube-sma11.ts"],
              ] as const).map(([jenjang, count, file]) => (
                <tr key={jenjang}>
                  <td className="p-2 border font-medium">{jenjang}</td>
                  <td className="p-2 border">{count}</td>
                  <td className="p-2 border font-mono text-xs">{file}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-slate-700">
            Fungsi <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">getYouTubeForTopic()</code> mendukung filtering per grade level. 
            Total <strong>232 video</strong> dari channel edukasi Indonesia terverifikasi.
          </p>
        </Section>

        <Section title="🚀 Agent Pipeline">
          <p className="mb-3">
            Pipeline trigger untuk menjalankan agent workflow dari dashboard — tersedia di <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">/dashboard/agents</code>.
          </p>

          <h3 className="font-semibold text-slate-800 mb-2">Pipeline Stages</h3>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4 leading-relaxed">
{`Student Selected
    │
    ▼
📚 Curriculum  ──► Generate draft kurikulum per student
    │
    ▼
📄 Content     ──► Scrape & process materi dari internet
    │
    ▼
📝 Quiz        ──► Generate soal dari materi
    │
    ▼
📅 Jadwal      ──► Assign jadwal belajar harian`}
          </pre>

          <h3 className="font-semibold text-slate-800 mb-2">How It Works</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-700 mb-3">
            <li><strong>Component:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">PipelineTrigger.tsx</code> — UI dengan tombol per stage + full pipeline</li>
            <li><strong>API:</strong> POST <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">/api/students</code> dengan body <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{`{action:"trigger", studentId, stages}`}</code></li>
            <li><strong>Queue:</strong> Setiap stage masuk ke BullMQ queue — otomatis fallback ke in-memory jika Redis tidak tersedia</li>
            <li><strong>Mode indicator:</strong> UI menampilkan apakah pakai BullMQ (✅) atau in-memory (🟡)</li>
          </ul>
        </Section>

        <Section title="Key Design Decisions">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Keputusan</th>
                <th className="p-2 text-left border">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Mindmap radial layout (no dagre)', 'Layout kustom memberikan kontrol penuh atas spacing & directional handles'],
                ['Quiz bank statis (pre-generated)', '1650 soal siap pakai tanpa LLM call — lebih cepat & hemat biaya'],
                ['Curriculum Agent verify content', 'Agent tahu kurikulum, lebih efisien daripada human review'],
                ['Scrape per priority', 'Hemat bandwidth — student butuh week_1 dulu'],
                ['Video hanya untuk topik visual', 'Video mahal & lama, text lebih cepat untuk topik teoritis'],
                ['YouTube sebagai storage', 'Tidak simpan video di server, cukup simpan URL'],
                ['3 persona berbeda', 'Sesuai jenjang SD/SMP/SMA — pendekatan pedagogis berbeda'],
                ['In-memory queue fallback', 'Memudahkan development tanpa Redis, transparent switch'],
              ] as const).map(([decision, reason]) => (
                <tr key={decision}>
                  <td className="p-2 border font-medium">{decision}</td>
                  <td className="p-2 border text-slate-700">{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
        {title}
      </h2>
      {children}
    </div>
  )
}

function AgentCard({
  emoji,
  name,
  description,
  details,
}: {
  emoji: string
  name: string
  description: string
  details: string[]
}) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all">
      <span className="text-3xl mt-1">{emoji}</span>
      <div>
        <h3 className="font-semibold text-slate-900 text-lg">{name}</h3>
        <p className="text-slate-600 mb-2">{description}</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
          {details.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DataCard({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div className="p-3 rounded-lg bg-white border border-slate-200">
      <h4 className="font-semibold text-slate-800 mb-2 text-sm">{title}</h4>
      <ul className="text-sm text-slate-600 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-xs">• {item}</li>
        ))}
      </ul>
    </div>
  )
}

function EntityCard({
  name,
  fields,
}: {
  name: string
  fields: string[]
}) {
  return (
    <div className="p-3 rounded-lg bg-white border border-slate-200">
      <h4 className="font-semibold text-indigo-700 mb-2">{name}</h4>
      <ul className="text-sm text-slate-600 space-y-0.5">
        {fields.map((f) => (
          <li key={f} className="font-mono text-xs">• {f}</li>
        ))}
      </ul>
    </div>
  )
}
