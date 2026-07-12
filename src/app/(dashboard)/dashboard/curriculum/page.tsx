"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ── */

type Student = {
  id: string;
  studentId: string;
  name: string;
  gradeLevel: string;
};

type Material = {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: string;
  weekOrder: number;
  status: string;
  curriculumId: string;
  createdAt: string;
};

type Curriculum = {
  id: string;
  studentId: string;
  version: number;
  materials: Material[];
};

const SUBJECTS = ["IPA", "Matematika", "IPS", "Bahasa Indonesia", "Bahasa Inggris", "PPKN"];
const MATERIAL_TYPES = ["quiz", "materi", "video", "latihan"];

const MATERIAL_TYPE_STYLES: Record<string, { bg: string; fg: string }> = {
  quiz: { bg: "rgba(124,58,237,0.12)", fg: "#a78bfa" },
  materi: { bg: "rgba(59,130,246,0.12)", fg: "#60a5fa" },
  video: { bg: "rgba(239,68,68,0.12)", fg: "#f87171" },
  latihan: { bg: "rgba(34,197,94,0.12)", fg: "#4ade80" },
};

const GRADE_LABELS: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SMP_1: "SMP Kelas 1",
  SMA_2: "SMA Kelas 2",
};

/* ── Material Form (used for both add & edit) ── */

type MaterialFormData = {
  title: string;
  description: string;
  subject: string;
  type: string;
  weekOrder: number;
};

const EMPTY_FORM: MaterialFormData = {
  title: "",
  description: "",
  subject: SUBJECTS[0],
  type: MATERIAL_TYPES[0],
  weekOrder: 1,
};

/* ── Main Component ── */

export default function CurriculumEditorPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [allStudentsData, setAllStudentsData] = useState<Record<string, Curriculum | null>>({});

  // Add/Edit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  /* ── Fetch students ── */

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students || []))
      .catch(() => {});
  }, []);

  /* ── Fetch curriculum for selected student ── */

  const fetchCurriculum = useCallback(async (studentId: string) => {
    if (!studentId) {
      setCurriculum(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/curriculum?studentId=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setCurriculum(data.curriculum || data);
      } else {
        setCurriculum(null);
      }
    } catch {
      setCurriculum(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurriculum(selectedStudentId);
  }, [selectedStudentId, fetchCurriculum]);

  /* ── Fetch curriculum for all students (accordion view) ── */

  const fetchAllStudentsCurriculum = useCallback(async () => {
    const results: Record<string, Curriculum | null> = {};
    for (const s of students) {
      try {
        const res = await fetch(`/api/admin/curriculum?studentId=${s.studentId}`);
        if (res.ok) {
          results[s.studentId] = await res.json();
        }
      } catch {
        results[s.studentId] = null;
      }
    }
    setAllStudentsData(results);
  }, [students]);

  useEffect(() => {
    if (expandedStudent === "__all__") {
      fetchAllStudentsCurriculum();
    }
  }, [expandedStudent, fetchAllStudentsCurriculum]);

  /* ── Generate curriculum ── */

  async function handleGenerateCurriculum() {
    if (!selectedStudentId) return;
    setGenerating(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      if (res.ok) {
        setMsg("✅ Kurikulum berhasil dibuat!");
        fetchCurriculum(selectedStudentId);
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message || "Unknown error"}`);
      }
    } catch {
      setMsg("❌ Gagal membuat kurikulum");
    } finally {
      setGenerating(false);
    }
  }

  /* ── Add material ── */

  async function handleAddMaterial() {
    if (!curriculum || !formData.title.trim()) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/curriculum/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculumId: curriculum.id,
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          type: formData.type,
          weekOrder: formData.weekOrder,
        }),
      });
      if (res.ok) {
        setMsg("✅ Materi berhasil ditambahkan!");
        setShowAddModal(false);
        setFormData(EMPTY_FORM);
        fetchCurriculum(selectedStudentId);
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal menambahkan materi");
    } finally {
      setSaving(false);
    }
  }

  /* ── Edit material ── */

  async function handleEditMaterial() {
    if (!editingMaterial || !formData.title.trim()) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/curriculum/material/${editingMaterial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setMsg("✅ Materi berhasil diupdate!");
        setEditingMaterial(null);
        setFormData(EMPTY_FORM);
        fetchCurriculum(selectedStudentId);
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal mengupdate materi");
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete material ── */

  async function handleDeleteMaterial(id: string) {
    setDeletingId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/curriculum/material/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMsg("✅ Materi berhasil dihapus!");
        setConfirmDelete(null);
        fetchCurriculum(selectedStudentId);
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal menghapus materi");
    } finally {
      setDeletingId(null);
    }
  }

  /* ── Reorder material ── */

  async function handleReorder(materialId: string, newWeekOrder: number) {
    if (newWeekOrder < 1) return;
    setMsg("");
    try {
      const res = await fetch(`/api/admin/curriculum/material/${materialId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekOrder: newWeekOrder }),
      });
      if (res.ok) {
        fetchCurriculum(selectedStudentId);
      } else {
        const e = await res.json();
        setMsg(`❌ Gagal reorder: ${e.error || e.message}`);
      }
    } catch {
      setMsg("❌ Gagal reorder");
    }
  }

  /* ── Edit button handler ── */

  function startEdit(m: Material) {
    setEditingMaterial(m);
    setFormData({
      title: m.title,
      description: m.description || "",
      subject: m.subject,
      type: m.type,
      weekOrder: m.weekOrder,
    });
  }

  /* ── Helpers ── */

  const selectedStudent = students.find((s) => s.studentId === selectedStudentId);
  const currentStudentId = selectedStudentId;
  const noCurriculum = !loading && !curriculum;

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          📚 Kurikulum
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Kelola materi dan kurikulum untuk setiap murid
        </p>
      </div>

      {/* Message banner */}
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

      {/* Searchable student selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            list="student-options"
            placeholder="Cari murid..."
            value={selectedStudent ? `${selectedStudent.name} (${selectedStudent.gradeLevel})` : ""}
            onChange={(e) => {
              const found = students.find(
                (s) => `${s.name} (${s.gradeLevel})` === e.target.value
              );
              if (found) {
                setSelectedStudentId(found.studentId);
              } else if (!e.target.value) {
                setSelectedStudentId("");
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{
              backgroundColor: "var(--su-bg-card)",
              borderColor: "var(--su-border)",
              color: "var(--su-text)",
            }}
          />
          <datalist id="student-options">
            {students.map((s) => (
              <option key={s.studentId} value={`${s.name} (${s.gradeLevel})`} />
            ))}
          </datalist>
        </div>
        <button
          onClick={() => setExpandedStudent(expandedStudent === "__all__" ? null : "__all__")}
          className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            backgroundColor: expandedStudent === "__all__" ? "rgba(59,130,246,0.12)" : "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
            color: expandedStudent === "__all__" ? "var(--su-info)" : "var(--su-text)",
          }}
        >
          {expandedStudent === "__all__" ? "📖 Pilih Murid" : "📅 Semua Murid"}
        </button>
      </div>

      {/* Student-specific view */}
      {currentStudentId && expandedStudent !== "__all__" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
          }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: "var(--su-border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>
                {selectedStudent?.name}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: "rgba(59,130,246,0.12)",
                  color: "var(--su-info)",
                }}
              >
                {selectedStudent ? (GRADE_LABELS[selectedStudent.gradeLevel] ?? selectedStudent.gradeLevel) : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {curriculum && (
                <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
                  v{curriculum.version} · {curriculum.materials.length} materi
                </span>
              )}
              {curriculum && (
                <button
                  onClick={() => {
                    setFormData(EMPTY_FORM);
                    setShowAddModal(true);
                  }}
                  className="text-xs px-3 py-1.5 rounded font-medium cursor-pointer"
                  style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--su-success)" }}
                >
                  +
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--su-text-dim)" }}>
              Memuat kurikulum...
            </div>
          ) : noCurriculum ? (
            <div className="p-8 text-center space-y-4">
              <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
                Belum ada kurikulum untuk murid ini.
              </p>
              <button
                onClick={handleGenerateCurriculum}
                disabled={generating}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: generating ? "#64748b" : "#7c3aed",
                  cursor: generating ? "wait" : "pointer",
                }}
              >
                {generating ? "⏳ Generating..." : "⚡ Generate Kurikulum"}
              </button>
            </div>
          ) : (
            <MaterialList
              materials={curriculum?.materials || []}
              onEdit={startEdit}
              onDelete={(id) => setConfirmDelete(id)}
              onReorder={handleReorder}
              deletingId={deletingId}
            />
          )}
        </div>
      )}

      {/* All students accordion */}
      {expandedStudent === "__all__" && (
        <div className="space-y-4">
          {students.map((s) => (
            <div
              key={s.studentId}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--su-bg-card)",
                border: "1px solid var(--su-border)",
              }}
            >
              <button
                onClick={() =>
                  setExpandedStudent(expandedStudent === s.studentId ? null : s.studentId)
                }
                className="w-full flex items-center justify-between px-5 py-3 text-left cursor-pointer"
                style={{ borderBottom: "1px solid var(--su-border)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>
                    {s.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: "rgba(59,130,246,0.12)",
                      color: "var(--su-info)",
                    }}
                  >
                    {GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel}
                  </span>
                </div>
                <span className="text-sm" style={{ color: "var(--su-text-dim)" }}>
                  {expandedStudent === s.studentId ? "▼" : "▶"}
                </span>
              </button>
              {expandedStudent === s.studentId && (
                <div>
                  {allStudentsData[s.studentId] ? (
                    <MaterialList
                      materials={allStudentsData[s.studentId]?.materials || []}
                      readOnly
                    />
                  ) : (
                    <div className="p-5 text-center text-sm" style={{ color: "var(--su-text-dim)" }}>
                      Belum ada kurikulum.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingMaterial) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div
            className="rounded-xl p-6 w-full max-w-md mx-4 space-y-4"
            style={{
              backgroundColor: "var(--su-bg-card)",
              border: "1px solid var(--su-border)",
            }}
          >
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {editingMaterial ? "✏️ Edit Materi" : "➕ Tambah Materi"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                  Judul
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{
                    backgroundColor: "var(--su-bg-card)",
                    borderColor: "var(--su-border)",
                    color: "var(--su-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border"
                    style={{
                      backgroundColor: "var(--su-bg-card)",
                      borderColor: "var(--su-border)",
                      color: "var(--su-text)",
                    }}
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                    Tipe
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border"
                    style={{
                      backgroundColor: "var(--su-bg-card)",
                      borderColor: "var(--su-border)",
                      color: "var(--su-text)",
                    }}
                  >
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--su-text-dim)" }}>
                  Minggu Ke
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.weekOrder}
                  onChange={(e) => setFormData({ ...formData, weekOrder: Math.max(1, parseInt(e.target.value) || 1) })}
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
                  setShowAddModal(false);
                  setEditingMaterial(null);
                  setFormData(EMPTY_FORM);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)", color: "var(--su-text)" }}
              >
                Batal
              </button>
              <button
                onClick={editingMaterial ? handleEditMaterial : handleAddMaterial}
                disabled={saving || !formData.title.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: saving ? "#64748b" : "#7c3aed",
                }}
              >
                {saving ? "⏳ Menyimpan..." : editingMaterial ? "Simpan" : "Tambah"}
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
              🐔 Konfirmasi Hapus
            </h2>
            <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
              Yakin ingin menghapus materi ini? Tindakan tidak dapat dibatalkan.
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
                onClick={() => handleDeleteMaterial(confirmDelete)}
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

/* ── MaterialList sub-component ── */

function MaterialList({
  materials,
  readOnly = false,
  onEdit,
  onDelete,
  onReorder,
  deletingId,
}: {
  materials: Material[];
  readOnly?: boolean;
  onEdit?: (m: Material) => void;
  onDelete?: (id: string) => void;
  onReorder?: (id: string, order: number) => void;
  deletingId?: string | null;
}) {
  // Group by week
  const byWeek: Record<number, Material[]> = {};
  materials.forEach((m) => {
    if (!byWeek[m.weekOrder]) byWeek[m.weekOrder] = [];
    byWeek[m.weekOrder].push(m);
  });
  const weeks = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);

  if (materials.length === 0) {
    return (
      <div className="p-5 text-center text-sm" style={{ color: "var(--su-text-dim)" }}>
        Belum ada materi dalam kurikulum ini.
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--su-border)" }}>
      {weeks.map((week) => (
        <div key={week}>
          <div className="px-5 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--su-text-dim)", backgroundColor: "rgba(0,0,0,0.02)" }}>
            Minggu {week}
          </div>
          <div>
            {byWeek[week].map((m) => {
              const ts = MATERIAL_TYPE_STYLES[m.type] || { bg: "var(--su-bg-card)", fg: "var(--su-text-dim)" };
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3 border-t"
                  style={{ borderColor: "var(--su-border)" }}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{m.title}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{ backgroundColor: ts.bg, color: ts.fg }}
                      >
                        {m.type}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "var(--su-info)" }}
                      >
                        {m.subject}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--su-text-dim)" }}>
                      {m.description || "Tidak ada deskripsi"}
                    </p>
                  </div>
                  {!readOnly && onEdit && onDelete && onReorder && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onReorder(m.id, m.weekOrder - 1)}
                        disabled={m.weekOrder <= 1}
                        className="text-xs px-2 py-1 rounded font-medium cursor-pointer disabled:opacity-30"
                        style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)", color: "var(--su-text)" }}
                        title="Naik minggu"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => onReorder(m.id, m.weekOrder + 1)}
                        className="text-xs px-2 py-1 rounded font-medium cursor-pointer"
                        style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)", color: "var(--su-text)" }}
                        title="Turun minggu"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => onEdit(m)}
                        className="text-xs px-2 py-1 rounded font-medium cursor-pointer ml-1"
                        style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "var(--su-info)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="text-xs px-2 py-1 rounded font-medium cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "var(--su-danger)" }}
                      >
                        {deletingId === m.id ? "..." : "Hapus"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
