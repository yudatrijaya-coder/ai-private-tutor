export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">
          🚀 Getting Started
        </h1>

        <Section title="Prerequisites">
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Node.js 20+</li>
            <li>npm</li>
            <li>Git</li>
            <li>Akses ke VPS (untuk production)</li>
          </ul>
        </Section>

        <Section title="Instalasi">
          <CodeBlock>
            {`git clone https://github.com/yudatrijaya-coder/ai-private-tutor.git
cd ai-private-tutor
cp .env.example .env
npm install`}
          </CodeBlock>
        </Section>

        <Section title="Environment Variables">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Variable</th>
                <th className="p-2 text-left border">Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border font-mono text-sm">DATABASE_URL</td>
                <td className="p-2 border">
                  Koneksi database (SQLite/PostgreSQL)
                </td>
              </tr>
              <tr>
                <td className="p-2 border font-mono text-sm">
                  TELEGRAM_BOT_TOKEN
                </td>
                <td className="p-2 border">Token bot @senangbelajar_bot</td>
              </tr>
              <tr>
                <td className="p-2 border font-mono text-sm">SUMOPOD_API_KEY</td>
                <td className="p-2 border">API key untuk LLM provider</td>
              </tr>
              <tr>
                <td className="p-2 border font-mono text-sm">
                  NEXTAUTH_SECRET
                </td>
                <td className="p-2 border">Secret untuk NextAuth.js</td>
              </tr>
              <tr>
                <td className="p-2 border font-mono text-sm">NEXTAUTH_URL</td>
                <td className="p-2 border">URL aplikasi</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="Development">
          <CodeBlock>
            {`npm run dev    # Development server di port 3001
npm run build  # Production build
npm start      # Production server di port 3000`}
          </CodeBlock>
        </Section>

        <Section title="Deploy ke VPS">
          <p className="mb-3">
            Aplikasi di-deploy menggunakan PM2 + Caddy reverse proxy.
          </p>
          <CodeBlock>
            {`pm2 start ecosystem.config.cjs   # Start via PM2
pm2 restart ai-private-tutor    # Restart aplikasi
pm2 logs ai-private-tutor       # Lihat log`}
          </CodeBlock>
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

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4">
      {children}
    </pre>
  )
}
