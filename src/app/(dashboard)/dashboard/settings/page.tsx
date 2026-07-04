export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ⚙️ Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Konfigurasi sistem AI Private Tutor
        </p>
      </div>

      <div className="grid gap-6">
        {/* General */}
        <section
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
          }}
        >
          <h2 className="font-semibold mb-3">Umum</h2>
          <div className="text-sm space-y-4" style={{ color: "var(--su-text-dim)" }}>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--su-border)" }}>
              <span>Port aplikasi</span>
              <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-xs">3001</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--su-border)" }}>
              <span>Database</span>
              <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-xs">SQLite (dev.db)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--su-border)" }}>
              <span>Delivery mode</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--su-success)" }}>TEXT only</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Video generation</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--su-warning)" }}>Deferred</span>
            </div>
          </div>
        </section>

        {/* Telegram */}
        <section
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
          }}
        >
          <h2 className="font-semibold mb-3">Telegram Bot</h2>
          <div className="text-sm space-y-4" style={{ color: "var(--su-text-dim)" }}>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--su-border)" }}>
              <span>Status bot</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "var(--su-info)" }}>
                {process.env.TELEGRAM_BOT_TOKEN ? "Terhubung" : "Tidak terhubung (token tidak diset)"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Webhook</span>
              <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-xs">/api/bot/webhook</span>
            </div>
          </div>
        </section>

        {/* Curriculum */}
        <section
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
          }}
        >
          <h2 className="font-semibold mb-3">Kurikulum & Konten</h2>
          <div className="text-sm" style={{ color: "var(--su-text-dim)" }}>
            <p>Semua konten berasal dari data bank lokal (curriculum-topics, curriculum-content, quiz-bank).</p>
            <p className="mt-1">Tidak ada dependensi scraping atau LLM untuk inisialisasi kurikulum.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
