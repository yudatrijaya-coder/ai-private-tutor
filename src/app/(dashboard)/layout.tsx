import { auth } from "@/lib/auth/auth";
import { logoutAction } from "./actions";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "/dashboard", label: "🏠 Dashboard" },
  { href: "/dashboard/students", label: "👥 Siswa" },
  { href: "/dashboard/curriculum", label: "📚 Kurikulum" },
  { href: "/dashboard/quizzes", label: "📝 Quiz & Exam" },
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
        <div className="px-4 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--su-border)" }}>
          <Image
            src="/logo-senangbelajar.jpg"
            alt="SenangBelajar"
            width={32}
            height={32}
            className="rounded-lg"
            style={{ objectFit: "cover" }}
          />
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SenangBelajar
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
            <form action={logoutAction}>
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
