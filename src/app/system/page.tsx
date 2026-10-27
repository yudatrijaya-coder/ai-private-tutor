import type { Metadata } from "next";
import { hasPanelSession, isPanelConfigured } from "@/lib/system/auth";
import { SystemPanel } from "./SystemPanel";
import { PanelLogin } from "./PanelLogin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kontrol Sistem — Senang Belajar",
  // The panel must never be indexed: it is an ops surface, not a product page.
  robots: { index: false, follow: false },
};

/**
 * `/system` — host control panel.
 *
 * Server component: decides between the login form and the panel, so an
 * unauthenticated visitor receives no service data at all (nothing is fetched
 * on their behalf).
 */
export default async function SystemPage() {
  const configured = isPanelConfigured();
  const authed = configured && (await hasPanelSession());

  if (!configured) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-900">Panel belum dikonfigurasi</h1>
          <p className="mt-2 text-sm text-amber-800">
            Set <code className="rounded bg-amber-100 px-1">SYSTEM_PANEL_SECRET</code> (minimal 32
            karakter) dan <code className="rounded bg-amber-100 px-1">SYSTEM_PANEL_PASSWORD_HASH</code>{" "}
            (bcrypt) di <code className="rounded bg-amber-100 px-1">.env</code>, lalu restart aplikasi.
          </p>
        </div>
      </main>
    );
  }

  if (!authed) return <PanelLogin />;

  return <SystemPanel />;
}
