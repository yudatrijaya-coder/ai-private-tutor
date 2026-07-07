export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">🏗️ Arsitektur</h1>

        <Section title="Tech Stack">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Layer</th>
                <th className="p-2 text-left border">Teknologi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border">Frontend</td>
                <td className="p-2 border">Next.js 16 + Tailwind CSS 4</td>
              </tr>
              <tr>
                <td className="p-2 border">Backend</td>
                <td className="p-2 border">Next.js API Routes + Prisma ORM</td>
              </tr>
              <tr>
                <td className="p-2 border">Database</td>
                <td className="p-2 border">SQLite (dev) / PostgreSQL (prod)</td>
              </tr>
              <tr>
                <td className="p-2 border">Queue</td>
                <td className="p-2 border">BullMQ + Redis / In-memory fallback</td>
              </tr>
              <tr>
                <td className="p-2 border">Bot</td>
                <td className="p-2 border">Telegraf.js (Telegram)</td>
              </tr>
              <tr>
                <td className="p-2 border">LLM</td>
                <td className="p-2 border">SumoPod / OpenCode / OpenRouter</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="7 Agent System">
          <p className="mb-6">
            AI Private Tutor menggunakan 7 agen AI yang saling terintegrasi.
          </p>
          {(
            [
              ['🤖', 'Tutor Agent', 'Interface utama via Telegram — chat, quiz, vision foto soal. 3 persona: Kak Budi (SD), Kak Dewi (SMP), Kak Raka (SMA).'],
              ['📚', 'Curriculum Agent', 'Generate & finalisasi kurikulum per student sesuai Kurikulum Merdeka. Tentukan topik & urutan belajar.'],
              ['📄', 'Content Agent', 'Scrape materi dari internet, extract & clean konten pembelajaran. Multi-source fallback.'],
              ['📝', 'Assessment Agent', 'Generate quiz/exam otomatis dari materi. Koreksi jawaban & track weak areas.'],
              ['🎬', 'Media Agent', 'Generate video pembelajaran dengan karakter favorit (Mbappe, Lisa BLACKPINK, dll). Upload ke YouTube.'],
              ['👨‍👩‍👧', 'Guardian Agent', 'Admission siswa baru, weekly report untuk ortu, early warning system jika ada masalah.'],
              ['⏰', 'Scheduler Agent', 'Atur jadwal harian (15 menit) & intensif (3-4 jam). Reminder & reschedule otomatis.'],
            ] as const
          ).map(([emoji, name, desc]) => (
            <div
              key={name}
              className="flex gap-3 mb-4 p-3 rounded-lg bg-white border border-slate-100"
            >
              <span className="text-2xl">{emoji}</span>
              <div>
                <h3 className="font-semibold text-slate-900">{name}</h3>
                <p className="text-slate-600 text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </Section>

        <Section title="Alur Data">
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`Guardian → admit student → Curriculum → draft topics → Content → scrape material
    ↓                                              ↓
Tutor ← chat & quiz ← Assessment ← generate quiz ← 
    ↓
Scheduler → reminder & jadwal`}
          </pre>
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
