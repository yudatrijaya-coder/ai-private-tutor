import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--su-bg)", color: "var(--su-text)" }}
    >
      <div
        className="text-center p-8 rounded-2xl max-w-md"
        style={{ backgroundColor: "var(--su-bg-card)" }}
      >
        <div className="text-7xl mb-4">🔍</div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Halaman Tidak Ditemukan
        </h1>
        <p className="mb-6 text-sm" style={{ color: "var(--su-text-dim)" }}>
          Waduh, halaman yang kamu cari nggak ada atau udah dipindahin. Yuk
          balik ke beranda!
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "var(--su-primary, #6366f1)" }}
        >
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}
