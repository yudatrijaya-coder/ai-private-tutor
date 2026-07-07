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
                ['LLM', 'SumoPod / OpenCode / OpenRouter'],
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
