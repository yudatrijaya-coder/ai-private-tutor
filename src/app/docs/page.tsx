import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          AI Private Tutor 📚
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Dokumentasi platform belajar pintar dengan 7 AI Agent terintegrasi.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <DocCard
            href="/docs/architecture"
            emoji="🏗️"
            title="Arsitektur"
            desc="7 Agent system, tech stack, queue architecture"
          />
          <DocCard
            href="/docs/getting-started"
            emoji="🚀"
            title="Getting Started"
            desc="Setup, instalasi, dan environment variables"
          />
        </div>
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
