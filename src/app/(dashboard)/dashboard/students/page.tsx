"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ── Types ── */

type StudentData = {
  id: string;
  studentId: string;
  name: string;
  gradeLevel: string;
  status: string;
  telegramId: string | null;
  parentTelegramId: string | null;
  persona: string | null;
  hasPassword: boolean;
  createdAt: string;
  _count: {
    chatLogs: number;
    curriculums: number;
    quizAttempts: number;
  };
};

type PageData = {
  students: StudentData[];
  total: number;
  page: number;
  totalPages: number;
};

type StatsData = {
  total: number;
  active: number;
  pending: number;
  paused: number;
  archived: number;
};

type SortField = "name" | "gradeLevel" | "status" | "createdAt" | "studentId";
type SortDir = "asc" | "desc";

/* ── Constants ── */

const GRADE_LABELS: Record<string, string> = {
  SD_5: "SD 5",
  SMP_1: "SMP 1",
  SMA_2: "SMA 2",
};

const STATUS_CONFIG: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  ACTIVE: { bg: "rgba(34,197,94,0.12)", fg: "var(--su-success)", label: "Active" },
  PENDING: {
    bg: "rgba(245,158,11,0.12)",
    fg: "var(--su-warning)",
    label: "Pending",
  },
  PAUSED: {
    bg: "rgba(100,116,139,0.12)",
    fg: "var(--su-text-dim)",
    label: "Paused",
  },
  ARCHIVED: {
    bg: "rgba(239,68,68,0.12)",
    fg: "var(--su-danger)",
    label: "Archived",
  },
};

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PENDING", label: "Pending" },
  { key: "PAUSED", label: "Paused" },
  { key: "ARCHIVED", label: "Archived" },
];

const GRADE_OPTIONS = [
  { value: "SD_5", label: "SD Kelas 5" },
  { value: "SMP_1", label: "SMP Kelas 1" },
  { value: "SMA_2", label: "SMA Kelas 2" },
];

const PERSONA_OPTIONS = [
  { value: "KAK_BUDI", label: "Kak Budi" },
  { value: "KAK_DEWI", label: "Kak Dewi" },
  { value: "KAK_RAKA", label: "Kak Raka" },
];

/* ── Helpers ── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* ── Toast ── */

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: {
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.3)",
      fg: "var(--su-success)",
    },
    error: {
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.3)",
      fg: "var(--su-danger)",
    },
    info: {
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.3)",
      fg: "var(--su-info)",
    },
  };

  const c = colors[type];

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl animate-[fadeIn_0.2s_ease-out]"
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.fg,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </div>
  );
}

/* ── Modal ── */

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--su-text)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-sm cursor-pointer"
            style={{ color: "var(--su-text-dim)" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Add Student Modal ── */

function AddStudentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("SD_5");
  const [persona, setPersona] = useState("KAK_BUDI");
  const [telegramId, setTelegramId] = useState("");
  const [parentTelegramId, setParentTelegramId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama siswa harus diisi");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          gradeLevel,
          persona: persona || undefined,
          telegramId: telegramId.trim() || undefined,
          parentTelegramId: parentTelegramId.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Gagal membuat siswa");
        return;
      }

      setName("");
      setGradeLevel("SD_5");
      setPersona("KAK_BUDI");
      setTelegramId("");
      setParentTelegramId("");
      onCreated();
      onClose();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="➕ Tambah Siswa Baru" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg"
            style={{
              backgroundColor: "rgba(239,68,68,0.12)",
              color: "var(--su-danger)",
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--su-text)" }}>
            Nama Lengkap <span className="text-red-400">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masukkan nama siswa"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
            style={{
              backgroundColor: "var(--su-bg)",
              border: "1px solid var(--su-border)",
              color: "var(--su-text)",
              "--tw-ring-color": "var(--su-accent)",
            } as React.CSSProperties}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--su-text)" }}>
              Kelas <span className="text-red-400">*</span>
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            >
              {GRADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--su-text)" }}>
              Persona
            </label>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            >
              {PERSONA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--su-text)" }}>
            Telegram ID <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>(opsional)</span>
          </label>
          <input
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="e.g. 123456789"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--su-bg)",
              border: "1px solid var(--su-border)",
              color: "var(--su-text)",
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--su-text)" }}>
            Telegram Orang Tua <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>(opsional)</span>
          </label>
          <input
            value={parentTelegramId}
            onChange={(e) => setParentTelegramId(e.target.value)}
            placeholder="e.g. 987654321"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--su-bg)",
              border: "1px solid var(--su-border)",
              color: "var(--su-text)",
            }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--su-bg)",
              border: "1px solid var(--su-border)",
              color: "var(--su-text)",
            }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--su-accent)",
              color: "#fff",
            }}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Inline Edit Cell ── */

function InlineEditCell({
  value,
  options,
  onSave,
  onCancel,
}: {
  value: string;
  options?: { value: string; label: string }[];
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [editVal, setEditVal] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Select all text on focus
    if (inputRef.current && "select" in inputRef.current) {
      (inputRef.current as HTMLInputElement).select();
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSave(editVal);
    if (e.key === "Escape") onCancel();
  }

  if (options) {
    return (
      <select
        ref={inputRef as React.Ref<HTMLSelectElement>}
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={() => onSave(editVal)}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 rounded text-sm outline-none"
        style={{
          backgroundColor: "var(--su-bg)",
          border: "1px solid var(--su-accent)",
          color: "var(--su-text)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.Ref<HTMLInputElement>}
      value={editVal}
      onChange={(e) => setEditVal(e.target.value)}
      onBlur={() => onSave(editVal)}
      onKeyDown={handleKeyDown}
      className="w-full px-2 py-1 rounded text-sm outline-none"
      style={{
        backgroundColor: "var(--su-bg)",
        border: "1px solid var(--su-accent)",
        color: "var(--su-text)",
      }}
    />
  );
}

/* ── Main Component ── */

export default function StudentsPage() {
  const router = useRouter();

  // Data state
  const [data, setData] = useState<PageData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "name" | "gradeLevel" | "persona";
  } | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Action loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Password modal state
  const [passwordTarget, setPasswordTargetInternal] = useState<StudentData | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/students?${params}`);
      if (res.ok) {
        const pageData: PageData = await res.json();
        setData(pageData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  // Fetch stats summary
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/students?limit=1");
      if (!res.ok) return;
      const firstPage: PageData = await res.json();

      // Count all statuses with separate calls for simplicity
      const [activeRes, pendingRes, pausedRes, archivedRes] =
        await Promise.all([
          fetch("/api/admin/students?status=ACTIVE&limit=1"),
          fetch("/api/admin/students?status=PENDING&limit=1"),
          fetch("/api/admin/students?status=PAUSED&limit=1"),
          fetch("/api/admin/students?status=ARCHIVED&limit=1"),
        ]);

      const activeData = activeRes.ok ? ((await activeRes.json()) as PageData) : null;
      const pendingData = pendingRes.ok
        ? ((await pendingRes.json()) as PageData)
        : null;
      const pausedData = pausedRes.ok
        ? ((await pausedRes.json()) as PageData)
        : null;
      const archivedData = archivedRes.ok
        ? ((await archivedRes.json()) as PageData)
        : null;

      setStats({
        total: firstPage.total,
        active: activeData?.total ?? 0,
        pending: pendingData?.total ?? 0,
        paused: pausedData?.total ?? 0,
        archived: archivedData?.total ?? 0,
      });
    } catch {
      // stats non-critical
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [data?.students]);

  // ── Handlers ──

  function showToast(message: string, type: "success" | "error" | "info") {
    setToast({ message, type });
  }

  async function handleArchive(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`✅ "${name}" archived`, "success");
        fetchStudents();
        fetchStats();
      } else {
        const e = await res.json();
        showToast(`❌ ${e.error}`, "error");
      }
    } catch {
      showToast("❌ Failed to archive", "error");
    } finally {
      setActionLoading(id);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`⚠️ Yakin hapus permanen "${name}"?\n\nSemua data (kurikulum, quiz, progress) akan dihapus dari database.`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardDelete: true }),
      });
      if (res.ok) {
        showToast(`🗑️ "${name}" dihapus permanen`, "success");
        fetchStudents();
        fetchStats();
      } else {
        const e = await res.json();
        showToast(`❌ ${e.error}`, "error");
      }
    } catch {
      showToast("❌ Gagal menghapus", "error");
    } finally {
      setActionLoading(id);
    }
  }

  async function handleSoftHold(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED", holdMode: "SOFT" }),
      });
      if (res.ok) {
        showToast(`⏸️ "${name}" soft-hold (banner only)`, "info");
        fetchStudents();
        fetchStats();
      } else {
        const e = await res.json();
        showToast(`❌ ${e.error}`, "error");
      }
    } catch {
      showToast("❌ Gagal soft-hold", "error");
    } finally {
      setActionLoading(id);
    }
  }

  async function handleHardHold(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED", holdMode: "HARD" }),
      });
      if (res.ok) {
        showToast(`🔒 "${name}" hard-hold (blokir semua fitur)`, "info");
        fetchStudents();
        fetchStats();
      } else {
        const e = await res.json();
        showToast(`❌ ${e.error}`, "error");
      }
    } catch {
      showToast("❌ Gagal hard-hold", "error");
    } finally {
      setActionLoading(id);
    }
  }

  async function handleResume(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (res.ok) {
        showToast(`▶️ "${name}" aktif kembali`, "success");
        fetchStudents();
        fetchStats();
      } else {
        const e = await res.json();
        showToast(`❌ ${e.error}`, "error");
      }
    } catch {
      showToast("❌ Gagal resume", "error");
    } finally {
      setActionLoading(id);
    }
  }

  async function handleRestore(id: string, name: string) {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/students/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast(`✅ "${name}" restored`, "success");
        fetchStudents();
        fetchStats();
      } else {
        const e = await res.json();
        showToast(`❌ ${e.error}`, "error");
      }
    } catch {
      showToast("❌ Failed to restore", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleInlineSave(
    id: string,
    field: "name" | "gradeLevel" | "persona",
    value: string,
  ) {
    setEditingCell(null);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || undefined }),
      });
      if (res.ok) {
        showToast(`✅ ${field} updated`, "success");
        fetchStudents();
      } else {
        const e = await res.json();
        showToast(`❌ ${e.error}`, "error");
      }
    } catch {
      showToast("❌ Failed to update", "error");
    }
  }

  async function handleBulkArchive() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/students?id=${id}`, {
          method: "DELETE",
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    showToast(
      `✅ ${successCount} archived${failCount > 0 ? `, ${failCount} failed` : ""}`,
      failCount > 0 && successCount === 0 ? "error" : "success",
    );
    setSelectedIds(new Set());
    fetchStudents();
    fetchStats();
  }

  function handleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(data?.students.map((s) => s.id) ?? []);
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  }

  function handleSelectOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    setSelectAll(next.size === (data?.students.length ?? 0));
  }

  function handleCopyId(id: string, studentId: string) {
    copyToClipboard(studentId);
    showToast(`📋 ID "${studentId}" copied`, "info");
  }

  function openPasswordModal(student: StudentData) {
    setPasswordTargetInternal(student);
    setPasswordValue("");
    setPasswordError("");
  }

  async function handleSetPassword() {
    if (!passwordTarget) return;
    if (passwordValue.length < 6) {
      setPasswordError("Password minimal 6 karakter");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      const res = await fetch(`/api/admin/students/${passwordTarget.id}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordValue }),
      });
      if (res.ok) {
        showToast(`🔑 Password ${passwordTarget.name} berhasil diatur`, "success");
        setPasswordTargetInternal(null);
      } else {
        const data = await res.json();
        setPasswordError(data.error ?? "Gagal");
      }
    } catch {
      setPasswordError("Terjadi kesalahan");
    } finally {
      setPasswordSaving(false);
    }
  }

  // ── Derived ──

  const isArchived = (status: string) => status === "ARCHIVED";
  const selectedCount = selectedIds.size;

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            👥 Students
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
            {stats
              ? `${stats.total} total — ${stats.active} active, ${stats.pending} pending`
              : "Manage all registered students"}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: "var(--su-accent)",
            color: "#fff",
          }}
        >
          ➕ Add Student
        </button>
      </div>

      {/* ── Stats Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {stats
          ? [
              { label: "Total", value: stats.total, color: "var(--su-text)" },
              { label: "Active", value: stats.active, color: "var(--su-success)" },
              { label: "Pending", value: stats.pending, color: "var(--su-warning)" },
              { label: "Paused", value: stats.paused, color: "var(--su-text-dim)" },
              { label: "Archived", value: stats.archived, color: "var(--su-danger)" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 flex flex-col gap-1 glass-card"
                style={{
                  backgroundColor: "var(--su-bg-card)",
                  border: "1px solid var(--su-border)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--su-text-dim)" }}
                >
                  {stat.label}
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: stat.color, fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </span>
              </div>
            ))
          : Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl p-4 animate-pulse"
                style={{
                  backgroundColor: "var(--su-bg-card)",
                  border: "1px solid var(--su-border)",
                }}
              >
                <div
                  className="h-3 w-16 rounded mb-2"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                />
                <div
                  className="h-7 w-12 rounded"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                />
              </div>
            ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: "var(--su-text-dim)" }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search name, ID, or Telegram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl outline-none transition-shadow focus:ring-2"
            style={{
              backgroundColor: "var(--su-bg-card)",
              border: "1px solid var(--su-border)",
              color: "var(--su-text)",
              "--tw-ring-color": "var(--su-accent)",
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div
        className="flex gap-1 p-1 rounded-xl overflow-x-auto"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
        }}
      >
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-all"
              style={{
                backgroundColor: active ? "var(--su-accent)" : "transparent",
                color: active ? "#fff" : "var(--su-text-dim)",
              }}
            >
              {tab.label}
              {stats && tab.key !== "ALL" && (
                <span className="ml-1.5 text-xs opacity-70">
                  {stats[tab.key.toLowerCase() as keyof StatsData] ?? 0}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bulk Actions ── */}
      {selectedCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--su-text)" }}>
            {selectedCount} selected
          </span>
          <button
            onClick={handleBulkArchive}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "rgba(239,68,68,0.15)",
              color: "var(--su-danger)",
            }}
          >
            📦 Archive All
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--su-bg-hover)",
              color: "var(--su-text-dim)",
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div
        className="rounded-xl overflow-hidden shadow-lg"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {loading && !data ? (
          <div className="p-10 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div
                  className="h-4 w-4 rounded mt-1"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                />
                <div
                  className="h-4 w-1/4 rounded"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                />
                <div
                  className="h-4 w-1/6 rounded"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                />
                <div
                  className="h-4 w-1/8 rounded"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                />
                <div
                  className="h-4 w-1/6 rounded"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                />
              </div>
            ))}
          </div>
        ) : !data?.students.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p
              className="text-lg font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--su-text)" }}
            >
              {debouncedSearch || statusFilter !== "ALL"
                ? "No students match your filters"
                : "No students registered yet"}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
              {debouncedSearch || statusFilter !== "ALL"
                ? "Try adjusting your search or filter"
                : 'Click "Add Student" to register the first one'}
            </p>
          </div>
        ) : (
          <>
            {/* Table — responsive wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--su-border)",
                      backgroundColor: "var(--su-bg-hover)",
                    }}
                  >
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded cursor-pointer accent-[var(--su-accent)]"
                      />
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Name
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Student ID
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Grade
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Status
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Persona
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Telegram
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Parent TG
                    </th>
                    <th className="text-center p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Quizzes
                    </th>
                    <th className="text-left p-3 font-medium whitespace-nowrap hidden lg:table-cell" style={{ color: "var(--su-text-dim)" }}>
                      Created
                    </th>
                    <th className="text-right p-3 font-medium whitespace-nowrap" style={{ color: "var(--su-text-dim)" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s, idx) => {
                    const sc = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.ARCHIVED;
                    const isEditing =
                      editingCell?.id === s.id;
                    const isLoading = actionLoading === s.id;

                    return (
                      <tr
                        key={s.id}
                        className="group transition-colors"
                        style={{
                          borderBottom: "1px solid var(--su-border)",
                          backgroundColor:
                            selectedIds.has(s.id)
                              ? "rgba(99,102,241,0.04)"
                              : idx % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.015)",
                        }}
                      >
                        {/* Checkbox */}
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => handleSelectOne(s.id)}
                            className="rounded cursor-pointer accent-[var(--su-accent)]"
                          />
                        </td>

                        {/* Name — inline editable */}
                        <td className="p-3">
                          {isEditing && editingCell?.field === "name" ? (
                            <InlineEditCell
                              value={s.name}
                              onSave={(val) =>
                                handleInlineSave(s.id, "name", val)
                              }
                              onCancel={() => setEditingCell(null)}
                            />
                          ) : (
                            <button
                              onClick={() =>
                                setEditingCell({ id: s.id, field: "name" })
                              }
                              className="font-medium text-left cursor-text hover:opacity-80 transition-opacity"
                              style={{ color: "var(--su-text)" }}
                              title="Click to edit"
                            >
                              {s.name}
                              {s.hasPassword ? (
                                <span className="ml-1.5 text-[10px] opacity-50" title="Password sudah diatur">🔒</span>
                              ) : (
                                <span className="ml-1.5 text-[10px] opacity-40" title="Belum ada password">🔓</span>
                              )}
                            </button>
                          )}
                        </td>

                        {/* Student ID */}
                        <td className="p-3">
                          <span
                            className="font-mono text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "var(--su-bg)",
                              color: "var(--su-text-dim)",
                            }}
                          >
                            {s.studentId}
                          </span>
                        </td>

                        {/* Grade — inline editable */}
                        <td className="p-3">
                          {isEditing && editingCell?.field === "gradeLevel" ? (
                            <InlineEditCell
                              value={s.gradeLevel}
                              options={GRADE_OPTIONS}
                              onSave={(val) =>
                                handleInlineSave(s.id, "gradeLevel", val)
                              }
                              onCancel={() => setEditingCell(null)}
                            />
                          ) : (
                            <button
                              onClick={() =>
                                setEditingCell({
                                  id: s.id,
                                  field: "gradeLevel",
                                })
                              }
                              className="cursor-text hover:opacity-80 transition-opacity"
                              style={{ color: "var(--su-text-dim)" }}
                              title="Click to edit"
                            >
                              {GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel}
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{
                              backgroundColor: sc.bg,
                              color: sc.fg,
                            }}
                          >
                            {sc.label}
                          </span>
                        </td>

                        {/* Persona — inline editable */}
                        <td className="p-3">
                          {isEditing && editingCell?.field === "persona" ? (
                            <InlineEditCell
                              value={s.persona ?? ""}
                              options={PERSONA_OPTIONS}
                              onSave={(val) =>
                                handleInlineSave(s.id, "persona", val)
                              }
                              onCancel={() => setEditingCell(null)}
                            />
                          ) : (
                            <button
                              onClick={() =>
                                s.persona !== null &&
                                setEditingCell({
                                  id: s.id,
                                  field: "persona",
                                })
                              }
                              className={`text-sm ${s.persona ? "cursor-text hover:opacity-80" : ""} transition-opacity`}
                              style={{
                                color: s.persona
                                  ? "var(--su-text)"
                                  : "var(--su-text-dim)",
                              }}
                              title={s.persona ? "Click to edit" : ""}
                            >
                              {s.persona
                                ? s.persona.replace("KAK_", "Kak ")
                                : "—"}
                            </button>
                          )}
                        </td>

                        {/* Telegram ID */}
                        <td className="p-3">
                          {s.telegramId ? (
                            <span
                              className="font-mono text-xs cursor-pointer hover:text-[var(--su-info)] transition-colors"
                              style={{ color: "var(--su-text-dim)" }}
                              onClick={() => handleCopyId(s.id, s.telegramId!)}
                              title="Click to copy"
                            >
                              {s.telegramId.length > 8
                                ? `${s.telegramId.slice(0, 6)}...${s.telegramId.slice(-2)}`
                                : s.telegramId}
                            </span>
                          ) : (
                            <span style={{ color: "var(--su-text-dim)" }}>—</span>
                          )}
                        </td>

                        {/* Parent Telegram */}
                        <td className="p-3">
                          {s.parentTelegramId ? (
                            <span
                              className="font-mono text-xs cursor-pointer hover:text-[var(--su-info)] transition-colors"
                              style={{ color: "var(--su-text-dim)" }}
                              onClick={() =>
                                handleCopyId(s.id, s.parentTelegramId!)
                              }
                              title="Click to copy"
                            >
                              {s.parentTelegramId.length > 8
                                ? `${s.parentTelegramId.slice(0, 6)}...${s.parentTelegramId.slice(-2)}`
                                : s.parentTelegramId}
                            </span>
                          ) : (
                            <span style={{ color: "var(--su-text-dim)" }}>—</span>
                          )}
                        </td>

                        {/* Quiz Count */}
                        <td className="p-3 text-center">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: "rgba(99,102,241,0.1)",
                              color: "var(--su-accent)",
                            }}
                          >
                            {s._count.quizAttempts}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="p-3 hidden lg:table-cell" style={{ color: "var(--su-text-dim)" }}>
                          <span className="text-xs whitespace-nowrap">
                            {formatDate(s.createdAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View */}
                            <button
                              onClick={() =>
                                router.push(`/dashboard/students/${s.id}`)
                              }
                              className="p-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:opacity-80"
                              style={{
                                backgroundColor: "rgba(99,102,241,0.1)",
                                color: "var(--su-info)",
                              }}
                              title="View details"
                            >
                              👁
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() =>
                                router.push(`/dashboard/students/${s.id}`)
                              }
                              className="p-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:opacity-80"
                              style={{
                                backgroundColor: "rgba(99,102,241,0.1)",
                                color: "var(--su-info)",
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>

                            {/* Copy ID */}
                            <button
                              onClick={() => handleCopyId(s.id, s.studentId)}
                              className="p-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:opacity-80"
                              style={{
                                backgroundColor: "rgba(99,102,241,0.1)",
                                color: "var(--su-info)",
                              }}
                              title="Copy ID"
                            >
                              📋
                            </button>

                            {/* Set Password */}
                            <button
                              onClick={() =>
                                openPasswordModal(s)
                              }
                              className="p-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:opacity-80"
                              style={{
                                backgroundColor: "rgba(245,158,11,0.1)",
                                color: "var(--su-warning)",
                              }}
                              title="Set / Reset Password"
                            >
                              🔑
                            </button>

                            {/* Send Message */}
                            <button
                              onClick={() =>
                                router.push(`/dashboard/students/${s.id}/chat`)
                              }
                              className="p-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:opacity-80"
                              style={{
                                backgroundColor: "rgba(34,197,94,0.1)",
                                color: "var(--su-success)",
                              }}
                              title="Send message"
                            >
                              💬
                            </button>

                            {/* Hold buttons (only for ACTIVE students) */}
                            {s.status === "ACTIVE" ? (
                              <>
                                <button
                                  onClick={() => handleSoftHold(s.id, s.name)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40 transition-colors hover:opacity-80"
                                  style={{
                                    backgroundColor: "rgba(245,158,11,0.12)",
                                    color: "var(--su-warning)",
                                  }}
                                  title="Soft Hold — banner saja"
                                >
                                  {isLoading ? "..." : "⏸️"}
                                </button>
                                <button
                                  onClick={() => handleHardHold(s.id, s.name)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40 transition-colors hover:opacity-80"
                                  style={{
                                    backgroundColor: "rgba(239,68,68,0.12)",
                                    color: "var(--su-danger)",
                                  }}
                                  title="Hard Hold — blokir semua fitur"
                                >
                                  {isLoading ? "..." : "🔒"}
                                </button>
                              </>
                            ) : s.status === "PAUSED" ? (
                              <button
                                onClick={() => handleResume(s.id, s.name)}
                                disabled={isLoading}
                                className="p-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40 transition-colors hover:opacity-80"
                                style={{
                                  backgroundColor: "rgba(34,197,94,0.12)",
                                  color: "var(--su-success)",
                                }}
                                title="Resume / Aktifkan"
                              >
                                {isLoading ? "..." : "▶️"}
                              </button>
                            ) : null}

                            {/* Archive / Restore */}
                            {isArchived(s.status) ? (
                              <button
                                onClick={() => handleRestore(s.id, s.name)}
                                disabled={isLoading}
                                className="p-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40 transition-colors hover:opacity-80"
                                style={{
                                  backgroundColor: "rgba(59,130,246,0.12)",
                                  color: "var(--su-info)",
                                }}
                                title="Restore"
                              >
                                {isLoading ? "..." : "↩️"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(s.id, s.name)}
                                disabled={isLoading}
                                className="p-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40 transition-colors hover:opacity-80"
                                style={{
                                  backgroundColor: "rgba(245,158,11,0.12)",
                                  color: "var(--su-warning)",
                                }}
                                title="Archive"
                              >
                                {isLoading ? "..." : "📦"}
                              </button>
                            )}

                            {/* Delete permanent */}
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              disabled={isLoading}
                              className="p-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40 transition-colors hover:opacity-80"
                              style={{
                                backgroundColor: "rgba(239,68,68,0.12)",
                                color: "var(--su-danger)",
                              }}
                              title="Hapus Permanen"
                            >
                              {isLoading ? "..." : "🗑️"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {data && data.totalPages > 1 && (
              <div
                className="flex items-center justify-between px-4 py-3 border-t"
                style={{
                  borderColor: "var(--su-border)",
                  backgroundColor: "var(--su-bg-hover)",
                }}
              >
                <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
                  Showing {data.students.length} of {data.total} students
                </span>

                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "var(--su-bg-card)",
                      border: "1px solid var(--su-border)",
                      color: "var(--su-text)",
                    }}
                  >
                    ← Prev
                  </button>

                  {/* Page numbers */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({
                      length: Math.min(data.totalPages, 5),
                    }).map((_, i) => {
                      let pageNum: number;
                      if (data.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= data.totalPages - 2) {
                        pageNum = data.totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      const isCurrent = pageNum === page;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className="min-w-[2rem] px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          style={{
                            backgroundColor: isCurrent
                              ? "var(--su-accent)"
                              : "var(--su-bg-card)",
                            color: isCurrent ? "#fff" : "var(--su-text-dim)",
                            border: isCurrent
                              ? "none"
                              : "1px solid var(--su-border)",
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <span
                    className="text-xs px-2 sm:hidden"
                    style={{ color: "var(--su-text-dim)" }}
                  >
                    Page {data.page} / {data.totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "var(--su-bg-card)",
                      border: "1px solid var(--su-border)",
                      color: "var(--su-text)",
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Student Modal ── */}
      <AddStudentModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          fetchStudents();
          fetchStats();
        }}
      />

      {/* ── Set Password Modal ── */}
      <Modal
        open={passwordTarget !== null}
        title={`🔑 Set Password — ${passwordTarget?.name ?? ""}`}
        onClose={() => setPasswordTargetInternal(null)}
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
            Set atau reset password untuk login web siswa.
            <br />
            Student ID: <strong>{passwordTarget?.studentId}</strong>
          </p>

          {passwordError && (
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "rgba(239,68,68,0.12)",
                color: "var(--su-danger)",
              }}
            >
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--su-text)" }}>
              Password Baru
            </label>
            <input
              type="text"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              } as React.CSSProperties}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPasswordTargetInternal(null)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={passwordSaving}
              onClick={handleSetPassword}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "var(--su-accent)",
                color: "#fff",
              }}
            >
              {passwordSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
