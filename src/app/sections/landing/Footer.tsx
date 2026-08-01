import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-orange-100 bg-white px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[#78716c] md:flex-row">
        <p>© {new Date().getFullYear()} Senang Belajar. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/login/student" className="hover:text-[#f97316]">Login Siswa</Link>
          <Link href="/login" className="hover:text-[#f97316]">Login Orang Tua</Link>
          <Link href="/dashboard" className="hover:text-[#f97316]">Dashboard Admin</Link>
        </div>
      </div>
    </footer>
  );
}
