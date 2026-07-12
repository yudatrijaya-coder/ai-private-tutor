"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* ── Types ── */

type Quiz = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  subject: string;
  enabled: boolean;
  createdAt: string;
};

type QuizResponse = {
  quizzes: Quiz[];
  total: number;
  page: number;
  totalPages: number;
};

/* ── Constants ── */

const SUBJECTS = ["IPA", "Matematika", "IPS", "Bahasa Indonesia", "Bahasa Inggris", "PPKN"];
const DIFFICULTIES: ("easy" | "medium" | "hard" | "all")[] = ["all", "easy", "medium", "hard"];

const DIFFICULTY_STYLES: Record<string, { bg: string; fg: string }> = {
  easy: { bg: "rgba(34,197,94,0.12)", fg: "#4ade80" },
  medium: { bg: "rgba(245,158,11,0.12)", fg: "#fbbf24" },
  hard: { bg: "rgba(239,68,68,0.12)", fg: "#f87171" },
};

const SUBJECT_COLORS: Record<string, string> = {
  IPA: "#60a5fa",
  Matematika: "#a78bfa",
  IPS: "#fbbf24",
  "Bahasa Indonesia": "#4ade80",
  "Bahasa Inggris": "#f472b6",
  PPKN: "#fb923c",
};

const EMPTY_QUIZ = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  difficulty: "easy" as "easy" | "medium" | "hard",
  explanation: "",
  subject: SUBJECTS[0],
};

/* ── Main Component ── */

export default function QuizManagerPage() {
  const [data, setData] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState("all");
  const [activeDifficulty, setActiveDifficulty] = useState<"easy" | "medium" | "hard" | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [form, setForm] = useState(EMPTY_QUIZ);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (activeSubject !== "all") params.set("subject", activeSubject);
      if (activeDifficulty !== "all") params.set("difficulty", activeDifficulty);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/quizzes?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      setMsg("❌ Gagal memuat quiz");
    } finally {
      setLoading(false);
    }
  }, [page, activeSubject, activeDifficulty, search]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  /* ── Stats ── */

  const stats = useMemo(() => {
    if (!data?.quizzes) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    data.quizzes.forEach((q) => {
      map[q.subject] = (map[q.subject] || 0) + 1;
    });
    return map;
  }, [data]);

  /* ── Toggle enabled ── */

  async function toggleEnabled(id: string, enabled: boolean) {
    setMsg("");
    try {
      const res = await fetch(`/api/admin/quizzes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            quizzes: prev.quizzes.map((q) => (q.id === id ? { ...q, enabled } : q)),
          };
        });
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal mengupdate quiz");
    }
  }

  /* ── Create quiz ── */

  async function handleCreate() {
    if (!form.question.trim() || form.options.some((o) => !o.trim())) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg("✅ Quiz berhasil dibuat!");
        setShowModal(false);
        setForm(EMPTY_QUIZ);
        fetchQuizzes();
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal membuat quiz");
    } finally {
      setSaving(false);
    }
  }

  /* ── Update quiz ── */

  async function handleUpdate() {
    if (!editingQuiz || !form.question.trim() || form.options.some((o) => !o.trim())) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/quizzes/${editingQuiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg("✅ Quiz berhasil diupdate!");
        setEditingQuiz(null);
        setForm(EMPTY_QUIZ);
        fetchQuizzes();
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal mengupdate quiz");
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete quiz ── */

  async function handleDelete(id: string) {
    setDeletingId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/quizzes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMsg("✅ Quiz berhasil dihapus!");
        setConfirmDelete(null);
        fetchQuizzes();
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal menghapus quiz");
    } finally {
      setDeletingId(null);
    }
  }

  /* ── Edit button handler ── */

  function startEdit(q: Quiz) {
    setEditingQuiz(q);
    setForm({
      question: q.question,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      explanation: q.explanation || "",
      subject: q.subject,
    });
    setShowModal(true);
  }

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          📝 Quiz Manager
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Kelola soal quiz — {data ? `${data.total} total` : "memuat..."}
        </p>
      </div>

      {/* Message */}
      {msg && (
        <div
          className="text-sm px-4 py-2 rounded-lg"
          style={{
            backgroundColor: msg.startsWith("❌") ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
            color: msg.startsWith("❌") ? "var(--su-danger)" : "var(--su-success)",
          }}
        >
          {msg}
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subj) => {
            const count = stats[subj] || 0;
            return (
              <div
                key={subj}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: "var(--su-bg-card)",
                  border: "1px solid var(--su-border)",
                  color: SUBJECT_COLORS[subj] || "var(--su-text)",
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: SUBJECT_COLORS[subj] || "var(--su-text)" }}
                />
                {subj}: {count}
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Subject tabs */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setActiveSubject("all"); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{
              backgroundColor: activeSubject === "all" ? "rgba(59,130,246,0.12)" : "var(--su-bg-card)",
              color: activeSubject === "all" ? "var(--su-info)" : "var(--su-text-dim)",
              border: "1px solid var(--su-border)",
            }}
          >
            Semua
          </button>
          {SUBJECTS.map((subj) => (
            <button
              key={subj}
              onClick={() => { setActiveSubject(subj); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: activeSubject === subj ? "rgba(59,130,246,0.12)" : "var(--su-bg-card)",
                color: activeSubject === subj ? "var(--su-info)" : "var(--su-text-dim)",
                border: "1px solid var(--su-border)",
              }}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Difficulty tabs */}
        <div className="flex flex-wrap gap-1">
          {DIFFICULTIES.map((diff) => (
            <button
              key={diff}
              onClick={() => { setActiveDifficulty(diff); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer capitalize"
              style={{
                backgroundColor: activeDifficulty === diff ? "rgba(59,130,246,0.12)" : "var(--su-bg-card)",
                color: activeDifficulty === diff ? "var(--su-info)" : "var(--su-text-dim)",
                border: "1px solid var(--su-border)",
              }}
            >
              {diff === "all" ? "Semua Level" : diff}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Cari pertanyaan..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 text-sm rounded-lg border"
          style={{
            backgroundColor: "var(--su-bg-card)",
            borderColor: "var(--su-border)",
            color: "var(--su-text)",
          }}
        />
        <button
          onClick={() => {
            setEditingQuiz(null);
            setForm(EMPTY_QUIZ);
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer shrink-0"
          style={{ backgroundColor: "#7c3aed" }}
        >
          + Tambah
        </button>
      </div>

      {/* Quiz cards */}
      <div className="space-y-3">
        {loading && !data ? (
          <div className="text-center py-8 text-sm" style={{ color: "var(--su-text-dim)" }}>
            Memuat quiz...
          </div>
        ) : !data?.quizzes.length ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{
              backgroundColor: "var(--su-bg-card)",
              border: "1px dashed var(--su-border)",
              color: "var(--su-text-dim)",
            }}
          >
            <div className="text-4xl mb-3">📝</div>
            <p className="font-medium">Belum ada quiz</p>
            <p className="text-sm mt-1">Klik "Tambah" untuk membuat quiz baru</p>
          </div>
        ) : (
          data.quizzes.map((q) => {
            const ds = DIFFICULTY_STYLES[q.difficulty] || DIFFICULTY_STYLES.easy;
            return (
              <div
                key={q.id}
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: "var(--su-bg-card)",
                  border: "1px solid var(--su-border)",
                  opacity: q.enabled ? 1 : 0.7,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ backgroundColor: ds.bg, color: ds.fg }}
                      >
                        {q.difficulty}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${SUBJECT_COLORS[q.subject]}20`,
                          color: SUBJECT_COLORS[q.subject] || "var(--su-text)",
                        }}
                      >
                        {q.subject}
                      </span>
                      {!q.enabled && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{ backgroundColor: "rgba(100,116,139,0.12)", color: "var(--su-text-dim)" }}
                        >
                          disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--su-text)" }}>
                      {q.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleEnabled(q.id, !q.enabled)}
                      className="text-xs px-2 py-1 rounded font-medium cursor-pointer"
                      style={{
                        backgroundColor: q.enabled ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
                        color: q.enabled ? "var(--su-success)" : "var(--su-text-dim)",
                      }}
                    >
                      {q.enabled ? "On" : "Off"}
                    </button>
                    <button
                      onClick={() => startEdit(q)}
                      className="text-xs px-2 py-1 rounded font-medium cursor-pointer"
                      style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "var(--su-info)" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(q.id)}
                      disabled={deletingId === q.id}
                      className="text-xs px-2 py-1 rounded font-medium cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "var(--su-danger)" }}
                    >
                      {deletingId === q.id ? "..." : "Hapus"}
                    </button>
                  </div>
                </div>

                {/* Options preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{
                        backgroundColor: i === q.correctAnswer ? "rgba(34,197,94,0.08)" : "rgba(0,0,0,0.02)",
                        border: i === q.correctAnswer ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--su-border)",
                        color: i === q.correctAnswer ? "var(--su-success)" : "var(--su-text-dim)",
                      }}
                    >
                      <span className="font-mono text-xs shrink-0">{String.fromCharCode(65 + i)}.</span>
                      <span className="truncate">{opt}</span>
                      {i === q.correctAnswer && (
                        <span className="ml-auto text-xs font-medium shrink-0">✓ benar</span>
                      )}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <p className="text-xs" style={{ color: "var(--su-text-dim)" }}>
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)", color: "var(--su-text)" }}
          >
            ← Prev
          </button>
          <span style={{ color: "var(--su-text-dim)" }}>
            Hal {data.page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages || loading}
            className="px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)", color: "var(--su-text)" }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div
            className="rounded-xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--su-bg-card)",
              border: "1px solid var(--su-border)",
            }}
          >
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {editingQuiz ? "✏️ Edit Quiz" : "➕ Tambah Quiz"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                  Pertanyaan
                </label>
                <textarea
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{
                    backgroundColor: "var(--su-bg-card)",
                    borderColor: "var(--su-border)",
                    color: "var(--su-text)",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                    Mapel
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border"
                    style={{
                      backgroundColor: "var(--su-bg-card)",
                      borderColor: "var(--su-border)",
                      color: "var(--su-text)",
                    }}
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                    Level
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value as "easy" | "medium" | "hard" })}
                    className="w-full px-3 py-2 text-sm rounded-lg border"
                    style={{
                      backgroundColor: "var(--su-bg-card)",
                      borderColor: "var(--su-border)",
                      color: "var(--su-text)",
                    }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                  Pilihan Jawaban
                </label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={form.correctAnswer === i}
                        onChange={() => setForm({ ...form, correctAnswer: i })}
                        className="shrink-0"
                      />
                      <span className="text-xs font-mono shrink-0 w-4" style={{ color: "var(--su-text-dim)" }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...form.options];
                          next[i] = e.target.value;
                          setForm({ ...form, options: next });
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border"
                        style={{
                          backgroundColor: "var(--su-bg-card)",
                          borderColor: "var(--su-border)",
                          color: "var(--su-text)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                  Penjelasan (opsional)
                </label>
                <textarea
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{
                    backgroundColor: "var(--su-bg-card)",
                    borderColor: "var(--su-border)",
                    color: "var(--su-text)",
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingQuiz(null);
                  setForm(EMPTY_QUIZ);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)", color: "var(--su-text)" }}
              >
                Batal
              </button>
              <button
                onClick={editingQuiz ? handleUpdate : handleCreate}
                disabled={saving || !form.question.trim() || form.options.some((o) => !o.trim())}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: saving ? "#64748b" : "#7c3aed" }}
              >
                {saving ? "⏳ Menyimpan..." : editingQuiz ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div
            className="rounded-xl p-6 w-full max-w-sm mx-4 space-y-4 text-center"
            style={{
              backgroundColor: "var(--su-bg-card)",
              border: "1px solid var(--su-border)",
            }}
          >
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              🗑️ Konfirmasi Hapus
            </h2>
            <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
              Yakin ingin menghapus quiz ini? Tindakan tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)", color: "var(--su-text)" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "#ef4444" }}
              >
                {deletingId === confirmDelete ? "⏳ Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
