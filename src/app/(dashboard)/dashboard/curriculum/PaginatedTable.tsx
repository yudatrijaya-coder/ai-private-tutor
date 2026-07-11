"use client";

import { useState, useMemo } from "react";

interface Material {
  id: string;
  subject: string;
  topic: string;
  subTopic: string;
  weekOrder: number;
  status: string;
  delivery: string;
}

interface PaginatedTableProps {
  materials: Material[];
  /** Student grade level for PDF linking */
  gradeLevel?: string;
  /** Called when triggering content pipeline for a material */
  onTriggerContent?: (materialId: string, topic: string) => void;
  /** Called when editing sub topic */
  onEditSubTopic?: (materialId: string, subTopic: string) => void;
  /** Trigger button loading state */
  loadingTrigger?: string | null;
}

const PER_PAGE = 30;
const SUBJECT_COLORS: Record<string, string> = {
  IPAS: "#059669",
  "Bahasa Indonesia": "#d97706",
  "Bahasa Inggris": "#dc2626",
  "Pendidikan Pancasila": "#7c3aed",
  PJOK: "#ea580c",
  Informatika: "#0284c7",
  IPA: "#059669",
  IPS: "#0891b2",
  Matematika: "#2563eb",
  Ekonomi: "#65a30d",
  Geografi: "#0d9488",
  Sosiologi: "#9333ea",
};

function getSubjectColor(s: string) {
  return SUBJECT_COLORS[s] ?? "#64748b";
}

/* ── PDF mapping ── */
const PDF_MAP: Record<string, Record<string, string>> = {
  SD_5: {
    IPAS: "/pdf-sd5/IPAS_SD5_BS.pdf",
    PJOK: "/pdf-sd5/PJOK_SD5_BS.pdf",
    Informatika: "/pdf-sd5/Koding_SD5_BS.pdf",
    "Bahasa Inggris": "/pdf-sd5/Inggris_SD5_BS.pdf",
    "Bahasa Indonesia": "/pdf-sd5/Indonesia_SD5_BS.pdf",
    "Pendidikan Pancasila": "/pdf-sd5/Pancasila_SD5_BS.pdf",
  },
  SMP_1: {
    IPA: "/pdf-smp7/IPA_SMP7_BS.pdf",
    IPS: "/pdf-smp7/IPS_SMP7_BS.pdf",
    PJOK: "/pdf-smp7/PJOK_SMP7_BS.pdf",
    "Bahasa Indonesia": "/pdf-smp7/Indonesia_SMP7_BS.pdf",
    Informatika: "/pdf-smp7/Informatika_SMP7_BS.pdf",
    Matematika: "/pdf-smp7/Matematika_SMP7_BS.pdf",
    "Pendidikan Pancasila": "/pdf-smp7/Pancasila_SMP7_BS.pdf",
  },
};

function getPdfUrl(subject: string, gradeLevel?: string): string | null {
  return PDF_MAP[gradeLevel ?? ""]?.[subject] ?? null;
}

type SortKey = "weekOrder" | "subject" | "topic" | "status";

export function PaginatedTable({ materials, gradeLevel, onTriggerContent, onEditSubTopic, loadingTrigger }: PaginatedTableProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("weekOrder");
  const [sortAsc, setSortAsc] = useState(true);
  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = useMemo(() => {
    let items = materials;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.topic.toLowerCase().includes(q) ||
          m.subTopic.toLowerCase().includes(q)
      );
    }
    items = [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "weekOrder") cmp = a.weekOrder - b.weekOrder;
      else if (sortKey === "subject") cmp = a.subject.localeCompare(b.subject) || a.weekOrder - b.weekOrder;
      else if (sortKey === "topic") cmp = a.topic.localeCompare(b.topic) || a.weekOrder - b.weekOrder;
      else cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [materials, search, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE),
    [filtered, safePage]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortIcon(key: SortKey) {
    if (sortKey !== key) return " ↕";
    return sortAsc ? " ▲" : " ▼";
  }

  // Group by subject for display
  let currentSubject = "";
  let currentTopic = "";

  return (
    <div>
      {/* Search + Sort bar */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b text-xs"
        style={{ borderColor: "var(--su-border)", color: "var(--su-text-dim)" }}
      >
        <input
          type="text"
          placeholder="🔍 Cari mapel / topik..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 px-2 py-1 rounded border text-xs"
          style={{
            backgroundColor: "var(--su-bg)",
            borderColor: "var(--su-border)",
            color: "var(--su-text)",
          }}
        />
        <span>
          {filtered.length} dari {materials.length} materi
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: "var(--su-text-dim)" }}>
              <th className="text-left px-4 py-2 font-medium w-8">#</th>
              <th
                className="text-left px-4 py-2 font-medium cursor-pointer select-none"
                onClick={() => toggleSort("subject")}
              >
                Mapel{SortIcon("subject")}
              </th>
              <th
                className="text-left px-4 py-2 font-medium cursor-pointer select-none"
                onClick={() => toggleSort("topic")}
              >
                Topik{SortIcon("topic")}
              </th>
              <th className="text-left px-4 py-2 font-medium">Sub Topik</th>
              <th
                className="text-left px-4 py-2 font-medium cursor-pointer select-none w-16"
                onClick={() => toggleSort("weekOrder")}
              >
                Mg{SortIcon("weekOrder")}
              </th>
              <th className="text-left px-4 py-2 font-medium w-20">Status</th>
              <th className="text-left px-4 py-2 font-medium w-12">Delv</th>
              {(onTriggerContent || onEditSubTopic) && (
                <th className="text-left px-4 py-2 font-medium w-24">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((m) => {
              const isNewSubject = m.subject !== currentSubject;
              const isNewTopic = m.topic !== currentTopic && !isNewSubject;
              if (isNewSubject) currentSubject = m.subject;
              if (isNewTopic) currentTopic = m.topic;

              const isEditing = editId === m.id;

              return (
                <tr
                  key={m.id}
                  className="border-t"
                  style={{
                    borderColor: "var(--su-border)",
                    backgroundColor: isNewSubject ? "rgba(255,255,255,0.03)" : undefined,
                  }}
                >
                  <td className="px-4 py-2 text-xs" style={{ color: "var(--su-text-dim)" }}>
                    {m.weekOrder}
                  </td>
                  <td className="px-4 py-2">
                    {isNewSubject ? (
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded font-medium text-white"
                        style={{ backgroundColor: getSubjectColor(m.subject) }}
                      >
                        {m.subject}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "transparent" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium text-sm">{m.topic}</td>
                  <td className="px-4 py-2" style={{ color: "var(--su-text-dim)" }}>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-1.5 py-0.5 rounded text-xs border"
                          style={{
                            backgroundColor: "var(--su-bg)",
                            borderColor: "var(--su-border)",
                            color: "var(--su-text)",
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onEditSubTopic?.(m.id, editValue);
                              setEditId(null);
                            }
                            if (e.key === "Escape") setEditId(null);
                          }}
                        />
                        <button
                          onClick={() => {
                            onEditSubTopic?.(m.id, editValue);
                            setEditId(null);
                          }}
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ color: "var(--su-success)" }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ color: "var(--su-text-dim)" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:opacity-70"
                        onClick={() => {
                          setEditId(m.id);
                          setEditValue(m.subTopic);
                        }}
                        title="Klik untuk edit"
                      >
                        {m.subTopic || <span className="italic opacity-40">—</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs" style={{ color: "var(--su-text-dim)" }}>
                    {m.weekOrder}
                  </td>
                  <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-2"><DeliveryBadge delivery={m.delivery} /></td>
                  {(onTriggerContent || onEditSubTopic) && (
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {/* PDF link */}
                        {getPdfUrl(m.subject, gradeLevel) && (
                          <a
                            href={getPdfUrl(m.subject, gradeLevel)!}
                            target="_blank"
                            className="text-xs px-1.5 py-1 rounded transition-opacity hover:opacity-70"
                            title="Buka PDF SIBI"
                          >
                            📖
                          </a>
                        )}
                        {/* Slide viewer */}
                        <a
                          href={`/student/slides/${m.id}`}
                          target="_blank"
                          className="text-xs px-1.5 py-1 rounded transition-opacity hover:opacity-70"
                          title="Lihat slide"
                        >
                          📄
                        </a>
                        {/* Trigger content pipeline */}
                        {onTriggerContent && (
                          <button
                            onClick={() => onTriggerContent(m.id, m.topic)}
                            disabled={loadingTrigger === m.id}
                            className="text-xs px-1.5 py-1 rounded transition-opacity hover:opacity-70 disabled:opacity-30"
                            title="Generate konten"
                          >
                            {loadingTrigger === m.id ? "⏳" : "🚀"}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t text-sm"
          style={{ borderColor: "var(--su-border)", color: "var(--su-text-dim)" }}
        >
          <span>
            Halaman {safePage + 1} dari {totalPages} ({filtered.length} materi)
          </span>
          <div className="flex gap-2">
            <button
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded text-xs disabled:opacity-30"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                cursor: safePage === 0 ? "default" : "pointer",
              }}
            >
              ◀ Sebelumnya
            </button>
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded text-xs disabled:opacity-30"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                cursor: safePage >= totalPages - 1 ? "default" : "pointer",
              }}
            >
              Selanjutnya ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: "rgba(100,116,139,0.12)", fg: "var(--su-text-dim)" },
    RAW: { bg: "rgba(59,130,246,0.12)", fg: "var(--su-info)" },
    PROCESSED: { bg: "rgba(245,158,11,0.12)", fg: "var(--su-warning)" },
    VIDEO_READY: { bg: "rgba(34,197,94,0.12)", fg: "var(--su-success)" },
    READY: { bg: "rgba(34,197,94,0.12)", fg: "var(--su-success)" },
  };
  const c = colors[status] ?? { bg: "rgba(100,116,139,0.12)", fg: "var(--su-text-dim)" };
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded font-medium"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

function DeliveryBadge({ delivery }: { delivery: string }) {
  const icons: Record<string, string> = {
    TEXT: "📄",
    VIDEO: "🎬",
    TEXT_AND_VIDEO: "📄🎬",
  };
  return <span>{icons[delivery] ?? delivery}</span>;
}
