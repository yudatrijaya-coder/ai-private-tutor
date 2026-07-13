"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/student", label: "Beranda", icon: "🏠" },
  { href: "/student/quiz", label: "Quiz", icon: "📝" },
  { href: "/student/progress", label: "Progres", icon: "📊" },
  { href: "/student/profile-link", label: "Profil", icon: "🔑" },
  { href: "/student/profile", label: "Karakter", icon: "⭐" },
];

function getStudentName(searchParams: URLSearchParams): string {
  const fromParam = searchParams.get("name");
  if (fromParam) {
    if (typeof window !== "undefined") localStorage.setItem("student_name", fromParam);
    return fromParam;
  }
  if (typeof window !== "undefined") return localStorage.getItem("student_name") ?? "Teman Belajar";
  return "Teman Belajar";
}

function StudentHeader({ studentName }: { studentName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/student";

  return (
    <header
      className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
      style={{ backgroundColor: "var(--st-primary)", color: "#fff" }}
    >
      <div className="flex items-center gap-3">
        {!isHome && (
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer transition-opacity hover:opacity-80 shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            aria-label="Kembali"
          >
            ←
          </button>
        )}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ backgroundColor: "var(--st-mascot-bg)" }}
        >
          🦉
        </div>
        <div>
          <p className="text-xs opacity-80">Halo,</p>
          <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-st-display)" }}>
            {studentName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg">🔥</span>
        <span className="text-sm font-bold">3</span>
        <span className="text-lg ml-2">⭐</span>
        <span className="text-sm font-bold">120</span>
        <button
          onClick={() => {
            localStorage.clear();
            router.push("/login/student");
          }}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer transition-opacity hover:opacity-80"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          aria-label="Keluar"
          title="Keluar"
        >
          🚪
        </button>
      </div>
    </header>
  );
}

function StudentLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive initial name from query param or localStorage; persist query param
  const paramName = searchParams.get("name");
  const [studentName] = useState(() => getStudentName(searchParams));

  // Persist query param name to localStorage on mount (side-effect only, no setState)
  useEffect(() => {
    if (paramName) localStorage.setItem("student_name", paramName);
  }, [paramName]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--st-bg)", color: "var(--st-text)", fontFamily: "var(--font-st-body)" }}
    >
      <StudentHeader studentName={studentName} />
      <main className="flex-1 px-4 pb-24 max-w-lg mx-auto w-full">
        {children}
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 border-t z-50 safe-area-inset-bottom"
        style={{ backgroundColor: "#fff", borderColor: "#e5e7eb" }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors"
                style={{
                  color: isActive ? "var(--st-primary)" : "var(--st-text-dim)",
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={`text-xs ${isActive ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "var(--st-bg)" }} />}>
      <StudentLayoutInner>{children}</StudentLayoutInner>
    </Suspense>
  );
}
