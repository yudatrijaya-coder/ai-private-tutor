export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          🚀 Getting Started
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Panduan lengkap setup, instalasi, dan deployment AI Private Tutor.
        </p>

        <Section title="Prerequisites">
          <ul className="list-disc pl-6 space-y-1.5 text-slate-700">
            <li><strong>Node.js 20+</strong> — Runtime JavaScript</li>
            <li><strong>npm</strong> — Package manager</li>
            <li><strong>Git</strong> — Version control</li>
            <li><strong>Redis</strong> (opsional) — Untuk queue dengan BullMQ, fallback in-memory tersedia</li>
            <li><strong>Akses VPS</strong> — Untuk production deployment (PM2 + Caddy)</li>
          </ul>
        </Section>

        <Section title="Instalasi">
          <p className="mb-3 text-slate-700">
            Clone repository dan install dependencies:
          </p>
          <CodeBlock>
            {`git clone https://github.com/yudatrijaya-coder/ai-private-tutor.git
cd ai-private-tutor
cp .env.example .env
npm install`}
          </CodeBlock>
        </Section>

        <Section title="Environment Variables">
          <p className="mb-3 text-slate-700">
            Konfigurasi environment variables di file <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">.env</code>:
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 text-left border">Variable</th>
                <th className="p-2 text-left border">Deskripsi</th>
                <th className="p-2 text-left border">Required</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['DATABASE_URL', 'Koneksi database (SQLite / PostgreSQL)', '✅'],
                ['TELEGRAM_BOT_TOKEN', 'Token bot @senangbelajar_bot dari BotFather', '✅'],
                ['SUMOPOD_API_KEY', 'API key untuk LLM provider (SumoPod)', '✅'],
                ['NEXTAUTH_SECRET', 'Secret untuk NextAuth.js (generate dengan openssl rand)', '✅'],
                ['NEXTAUTH_URL', 'URL aplikasi (http://localhost:3000 untuk dev)', '✅'],
                ['REDIS_URL', 'URL Redis untuk BullMQ (opsional, fallback in-memory)', '—'],
              ] as const).map(([variable, desc, required]) => (
                <tr key={variable}>
                  <td className="p-2 border font-mono text-sm">{variable}</td>
                  <td className="p-2 border">{desc}</td>
                  <td className="p-2 border text-center">{required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Development">
          <p className="mb-3 text-slate-700">
            Jalankan development server:
          </p>
          <Divider />
          <CommandRow cmd="npm run dev" desc="Development server di port 3001" />
          <p className="mt-3 text-sm text-slate-500">
            Dev server menggunakan port 3001 untuk menghindari konflik dengan production.
          </p>
        </Section>

        <Section title="Production Build">
          <p className="mb-3 text-slate-700">
            Build dan jalankan production server:
          </p>
          <Divider />
          <CommandRow cmd="npm run build" desc="Production build (Next.js build)" />
          <CommandRow cmd="npm start" desc="Production server di port 3000" />
        </Section>

        <Section title="Setup Database">
          <p className="mb-3 text-slate-700">
            Inisialisasi database dengan Prisma:
          </p>
          <CodeBlock>
            {`npx prisma migrate dev    # Migrasi database (dev)
npx prisma generate       # Generate Prisma Client
npx prisma db seed        # Seed data awal (jika ada)`}
          </CodeBlock>
          <p className="mt-2 text-sm text-slate-500">
            Untuk SQLite, database akan dibuat otomatis di file <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">prisma/dev.db</code>.
          </p>
        </Section>

        <Section title="Deploy ke VPS">
          <p className="mb-3 text-slate-700">
            Aplikasi di-deploy menggunakan <strong>PM2</strong> process manager dengan <strong>Caddy</strong> sebagai reverse proxy untuk SSL otomatis.
          </p>

          <h3 className="text-lg font-semibold text-slate-800 mb-2">1. Install PM2</h3>
          <CodeBlock>{`npm install -g pm2`}</CodeBlock>

          <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-4">2. Start dengan PM2</h3>
          <CodeBlock>
            {`pm2 start ecosystem.config.cjs   # Start via PM2 ecosystem file
pm2 save                        # Save process list untuk auto-restart
pm2 startup                     # Generate startup script`}
          </CodeBlock>

          <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-4">3. Manajemen Aplikasi</h3>
          <CodeBlock>
            {`pm2 restart ai-private-tutor    # Restart aplikasi
pm2 stop ai-private-tutor       # Stop aplikasi
pm2 logs ai-private-tutor       # Lihat log real-time
pm2 monit                       # Monitor CPU & memory`}
          </CodeBlock>
        </Section>

        <Section title="Troubleshooting">
          <div className="space-y-4">
            <TroubleCard
              problem="Port 3000 sudah dipakai"
              solution="Ubah port di .env atau package.json, atau stop service lain yang menggunakan port tersebut."
            />
            <TroubleCard
              problem="Redis connection refused"
              solution="Pastikan Redis server berjalan. Atau hapus REDIS_URL dari .env untuk fallback ke in-memory queue."
            />
            <TroubleCard
              problem="Telegram bot tidak merespon"
              solution="Verifikasi TELEGRAM_BOT_TOKEN benar. Cek log dengan `pm2 logs ai-private-tutor` untuk melihat error."
            />
            <TroubleCard
              problem="Build gagal karena Prisma"
              solution="Jalankan `npx prisma generate` sebelum build. Pastikan DATABASE_URL di .env sudah benar."
            />
          </div>
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

function Divider() {
  return <div className="h-px bg-slate-200 mb-3" />
}

function CommandRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-2">
      <code className="bg-slate-100 px-3 py-1 rounded text-sm font-mono text-slate-800 whitespace-nowrap">
        {cmd}
      </code>
      <span className="text-slate-600 text-sm">{desc}</span>
    </div>
  )
}

function TroubleCard({
  problem,
  solution,
}: {
  problem: string
  solution: string
}) {
  return (
    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
      <p className="font-semibold text-amber-800 text-sm mb-1">⚠️ {problem}</p>
      <p className="text-amber-700 text-sm">{solution}</p>
    </div>
  )
}
