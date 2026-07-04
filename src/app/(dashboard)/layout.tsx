import { auth, signOut } from "@/lib/auth/auth";
import Link from "next/link";

const navLinks = [
  { href: "/dashboard", label: "🏠 Dashboard" },
  { href: "/dashboard/curriculum", label: "📚 Kurikulum" },
  { href: "/dashboard/agents", label: "🤖 Agent Pipeline" },
  { href: "/dashboard/settings", label: "⚙️ Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div
      className="min-h-screen flex"
      style={{
        backgroundColor: "var(--su-bg)",
        color: "var(--su-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex-shrink-0 border-r flex flex-col"
        style={{ borderColor: "var(--su-border)", backgroundColor: "var(--su-bg-card)" }}
      >
        <div className="px-4 py-4 border-b" style={{ borderColor: "var(--su-border)" }}>
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            🏠 AI Private Tutor
          </span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
              style={{
                color: "var(--su-text)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "var(--su-border)", color: "var(--su-text-dim)" }}>
          <div className="flex items-center justify-between">
            <span>{session?.user?.name ?? "👤 Parent"}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
