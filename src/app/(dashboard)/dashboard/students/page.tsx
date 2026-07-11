"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Student {
  id: string;
  studentId: string;
  name: string;
  gradeLevel: string;
  status: string;
  telegramId: string | null;
  parentTelegramId: string | null;
  createdAt: string;
  _count: {
    curriculums: number;
    quizzes: number;
    attempts: number;
  };
}

const GRADE_LABELS: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SMP_1: "SMP Kelas 1",
  SMA_2: "SMA Kelas 2",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadStudents() {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      setStudents(data.students ?? []);
    } catch {
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function handleDelete(studentId: string, name: string) {
    if (
      !confirm(
        `Hapus ${name} (${studentId})?\n\nSemua data terkait (kurikulum, quiz, progress) akan ikut terhapus!`,
      )
    )
      return;

    setDeleting(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Gagal: ${data.error}`);
      } else {
        setStudents((prev) => prev.filter((s) => s.studentId !== studentId));
      }
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className="p-8">Memuat data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">👥 Daftar Siswa</h1>
          <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
            Total {students.length} siswa
          </p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "var(--su-primary)", color: "#fff" }}
        >
          + Tambah Siswa
        </Link>
      </div>

      {error && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--su-danger)",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "1px solid var(--su-border)",
          backgroundColor: "var(--su-bg-card)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left"
              style={{ borderBottom: "1px solid var(--su-border)" }}
            >
              <th className="p-4 font-medium">Student ID</th>
              <th className="p-4 font-medium">Nama</th>
              <th className="p-4 font-medium">Kelas</th>
              <th className="p-4 font-medium">Telegram</th>
              <th className="p-4 font-medium">Parent</th>
              <th className="p-4 font-medium">Kurikulum</th>
              <th className="p-4 font-medium">Quiz</th>
              <th className="p-4 font-medium">Attempt</th>
              <th className="p-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr
                key={s.id}
                className="hover:opacity-80 transition-opacity"
                style={{ borderBottom: "1px solid var(--su-border)" }}
              >
                <td className="p-4">
                  <code
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ backgroundColor: "rgba(99,102,241,0.1)" }}
                  >
                    {s.studentId}
                  </code>
                </td>
                <td className="p-4 font-medium">
                  <Link
                    href={`/dashboard/students/${s.studentId}`}
                    className="hover:underline"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="p-4" style={{ color: "var(--su-text-dim)" }}>
                  {GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel}
                </td>
                <td className="p-4">
                  {s.telegramId ? (
                    <span className="text-green-400">✅ Terhubung</span>
                  ) : (
                    <span style={{ color: "var(--su-text-dim)" }}>—</span>
                  )}
                </td>
                <td className="p-4">
                  {s.parentTelegramId ? (
                    <span className="text-green-400">✅ Terhubung</span>
                  ) : (
                    <span style={{ color: "var(--su-text-dim)" }}>—</span>
                  )}
                </td>
                <td className="p-4 text-center">{s._count.curriculums}</td>
                <td className="p-4 text-center">{s._count.quizzes}</td>
                <td className="p-4 text-center">{s._count.attempts}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(s.studentId, s.name)}
                    disabled={deleting === s.studentId}
                    className="text-xs px-3 py-1 rounded-lg transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: "rgba(239,68,68,0.15)",
                      color: "#ef4444",
                    }}
                  >
                    {deleting === s.studentId ? "..." : "Hapus"}
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center" style={{ color: "var(--su-text-dim)" }}>
                  Belum ada siswa.{" "}
                  <Link href="/dashboard/students/new" className="underline">
                    Daftarkan sekarang
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
