import { auth, signOut } from "@/lib/auth/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--su-bg)",
        color: "var(--su-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Top Nav */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "var(--su-border)", backgroundColor: "var(--su-bg-card)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            🏠 AI Private Tutor
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: "var(--su-text-dim)" }}>
          <span>🔔</span>
          <span>{session?.user?.name ?? "👤 Parent"}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{
                backgroundColor: "var(--su-bg-hover)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text-dim)",
              }}
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      {/* Main */}
      <main className="p-6">{children}</main>
    </div>
  );
}
