import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          AI Private Tutor 📚
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Selamat datang di dokumentasi <strong>AI Private Tutor</strong> — platform belajar pintar
          dengan 7 AI Agent terintegrasi untuk siswa SD/SMP/SMA.
        </p>

        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <DocCard
            href="/docs/architecture"
            emoji="🏗️"
            title="Arsitektur"
            desc="7 Agent system, queue architecture, database schema, design decisions & pipeline flow"
          />
          <DocCard
            href="/docs/mindmap"
            emoji="🧠"
            title="Mindmap"
            desc="Premium interactive mindmap — radial layout, Lucide icons, per-node CSS animations"
          />
          <DocCard
            href="/docs/map"
            emoji="🗺️"
            title="Peta Fungsional"
            desc="Interactive mindmap of the entire app — 8 branches covering all features"
          />
          <DocCard
            href="/docs/getting-started"
            emoji="🚀"
            title="Getting Started"
            desc="Prerequisites, instalasi, environment variables, deployment & troubleshooting"
          />
        </div>

        <Section title="Fitur Utama">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Fitur</th>
                <th className="p-2 text-left border">Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['🤖 7 AI Agents', 'Tutor, Curriculum, Content, Assessment, Media, Guardian, Scheduler — saling terintegrasi dalam pipeline otomatis'],
                ['🧠 Mindmap Premium', 'Visualisasi topik belajar interaktif — radial layout, Lucide icons, CSS animations per node'],
                ['💬 Telegram Bot', 'Belajar via chat dengan 3 persona: Kak Budi (SD), Kak Dewi (SMP), Kak Raka (SMA)'],
                ['🌐 Web Dashboard', 'Monitoring progress untuk orang tua & admin, pipeline trigger, weekly report & early warning system'],
                ['📝 Quiz Bank 1650 Soal', 'Bank soal statis dari kurikulum SIBI, exam auto-generator, adaptive difficulty'],
                ['🎬 Video Pembelajaran', 'Generate video dengan karakter favorit (Mbappe, Lisa BLACKPINK), upload ke YouTube'],
                ['⏰ Jadwal Pintar', 'Sesi harian 15 menit & intensif 3-4 jam, reminder otomatis via Telegram'],
                ['📚 Kurikulum Merdeka', 'Curriculum Agent menyesuaikan topik & urutan belajar sesuai Kurikulum Merdeka SIBI 2026/2027'],
              ] as const).map(([fitur, deskripsi]) => (
                <tr key={fitur}>
                  <td className="p-2 border font-medium">{fitur}</td>
                  <td className="p-2 border text-slate-700">{deskripsi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Quick Links">
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="https://github.com/yudatrijaya-coder/ai-private-tutor"
              target="_blank"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
            >
              <span className="text-2xl">📂</span>
              <div>
                <h3 className="font-semibold text-slate-900">GitHub Repository</h3>
                <p className="text-sm text-slate-600">Source code & issue tracker</p>
              </div>
            </Link>
            <Link
              href="/docs/architecture"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
            >
              <span className="text-2xl">🏗️</span>
              <div>
                <h3 className="font-semibold text-slate-900">Architecture Deep Dive</h3>
                <p className="text-sm text-slate-600">7 agents, queue arch, DB schema, mindmap, design decisions</p>
              </div>
            </Link>
            <Link
              href="/docs/mindmap"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all bg-white"
            >
              <span className="text-2xl">🧠</span>
              <div>
                <h3 className="font-semibold text-slate-900">Mindmap Guide</h3>
                <p className="text-sm text-slate-600">Komponen, layout algorithm, theming, animations</p>
              </div>
            </Link>
            <Link
              href="/docs/map"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all bg-white"
            >
              <span className="text-2xl">🗺️</span>
              <div>
                <h3 className="font-semibold text-slate-900">Peta Fungsional App</h3>
                <p className="text-sm text-slate-600">Interactive mindmap — frontend, agents, LLM, infrastruktur</p>
              </div>
            </Link>
            <Link
              href="/docs/getting-started"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
            >
              <span className="text-2xl">🚀</span>
              <div>
                <h3 className="font-semibold text-slate-900">Setup Guide</h3>
                <p className="text-sm text-slate-600">Instalasi, environment, deployment</p>
              </div>
            </Link>
            <a
              href="https://t.me/senangbelajar_bot"
              target="_blank"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
            >
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="font-semibold text-slate-900">Telegram Bot</h3>
                <p className="text-sm text-slate-600">@senangbelajar_bot — coba sekarang</p>
              </div>
            </a>
          </div>
        </Section>

        <Section title="Tech Stack Overview">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['Next.js 16', 'App Router, Server Components, API Routes', 'bg-blue-50 border-blue-200 text-blue-800'],
              ['Tailwind CSS 4', 'Utility-first styling, responsive design', 'bg-cyan-50 border-cyan-200 text-cyan-800'],
              ['Prisma ORM', 'Type-safe database access, migrations', 'bg-emerald-50 border-emerald-200 text-emerald-800'],
              ['BullMQ', 'Queue processing, Redis-backed, in-memory fallback', 'bg-amber-50 border-amber-200 text-amber-800'],
              ['Telegraf.js', 'Telegram Bot API, webhook integration', 'bg-indigo-50 border-indigo-200 text-indigo-800'],
              ['SumoPod / 9Router LLM', 'AI agent orchestration, multi-model fallback chain', 'bg-purple-50 border-purple-200 text-purple-800'],
            ] as const).map(([tech, detail, style]) => (
              <div
                key={tech}
                className={`p-3 rounded-lg border ${style}`}
              >
                <h3 className="font-semibold text-sm">{tech}</h3>
                <p className="text-xs mt-1 opacity-80">{detail}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function DocCard({
  href,
  emoji,
  title,
  desc,
}: {
  href: string
  emoji: string
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="block p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all bg-white"
    >
      <div className="text-3xl mb-3">{emoji}</div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-600">{desc}</p>
    </Link>
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
