"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewStudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("SD_5");
  const [characterPreference, setCharacterPreference] = useState("");
  const [interests, setInterests] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    id: string;
    studentId: string;
    curriculumEnqueued: boolean;
    sessionCount: number;
    copiedFromTemplate?: string;
  } | null>(null);

  const gradeOptions = [
    { value: "SD_5", label: "SD Kelas 5" },
    { value: "SMP_1", label: "SMP Kelas 1" },
    { value: "SMA_2", label: "SMA Kelas 2" },
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          gradeLevel,
          characterPreference: characterPreference || undefined,
          interests: interests || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mendaftarkan siswa");
        return;
      }

      setResult(data);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" style={{ maxWidth: 560 }}>
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          👤 Daftarkan Siswa Baru
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Masukkan data siswa. Kurikulum dan materi akan dibuat otomatis dari
          bank konten lokal.
        </p>
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

      {result ? (
        <div
          className="rounded-xl p-6 space-y-4"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
          }}
        >
          <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--su-success)" }}>
            ✅ Siswa berhasil didaftarkan
          </div>
          <div className="text-sm space-y-1" style={{ color: "var(--su-text-dim)" }}>
            <p><span className="font-medium text-white">Nama:</span> {name}</p>
            <p>
              <span className="font-medium text-white">ID Siswa:</span>{" "}
              <code className="bg-gray-800 px-2 py-0.5 rounded text-xs">{result.studentId}</code>
            </p>
            <p><span className="font-medium text-white">Kurikulum:</span> {result.curriculumEnqueued ? "Dibuat ✅" : "Gagal ❌"}</p>
            <p><span className="font-medium text-white">Jadwal:</span> {result.sessionCount} sesi</p>
            {result.copiedFromTemplate && (
              <p><span className="font-medium text-white">Template:</span> Dicopy dari siswa template ✅</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/dashboard/curriculum")}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: "var(--su-primary)",
                color: "#fff",
              }}
            >
              📚 Lihat Kurikulum
            </button>
            <button
              onClick={() => {
                setResult(null);
                setName("");
                setGradeLevel("SD_5");
                setCharacterPreference("");
                setInterests("");
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: "var(--su-bg-card)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            >
              ➕ Daftar Lagi
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama siswa"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--su-bg-card)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kelas</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--su-bg-card)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            >
              {gradeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Karakter Favorit{" "}
              <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
                (opsional — nanti dipakai untuk video)
              </span>
            </label>
            <input
              value={characterPreference}
              onChange={(e) => setCharacterPreference(e.target.value)}
              placeholder="Contoh: Mbappe, Lisa BLACKPINK"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--su-bg-card)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Minat / Hobi{" "}
              <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
                (opsional)
              </span>
            </label>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Contoh: suka sepak bola, drawing, K-pop"
              rows={2}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none resize-none"
              style={{
                backgroundColor: "var(--su-bg-card)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--su-primary)",
              color: "#fff",
            }}
          >
            {saving ? "Mendaftarkan..." : "Daftarkan Siswa"}
          </button>
        </form>
      )}
    </div>
  );
}
