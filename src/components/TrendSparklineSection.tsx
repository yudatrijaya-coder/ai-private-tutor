"use server";

import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

async function getSessionStudentId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    return (payload as { studentId: string }).studentId;
  } catch {
    return null;
  }
}

const SUBJECT_COLORS: Record<string, string> = {
  Matematika: "#818cf8",
  "Bahasa Indonesia": "#34d399",
  "Bahasa Inggris": "#8b5cf6",
  IPA: "#fbbf24",
  IPAS: "#fbbf24",
  Informatika: "#22d3ee",
  PJOK: "#fb7185",
  "Pendidikan Pancasila": "#f472b6",
};

/** Sparkline SVG kecil (14 hari) untuk satu subject. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 80;
  const h = 24;
  if (points.length < 2) {
    return <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>—</div>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - 2 - ((p - min) / range) * (h - 4);
    return [x, y];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last - prev;
  return (
    <div className="flex items-center gap-1.5">
      <svg width={w} height={h} className="shrink-0">
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        className="text-[11px] font-bold"
        style={{ color: delta >= 0 ? "#16a34a" : "#dc2626" }}
      >
        {delta >= 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
      </span>
    </div>
  );
}

export default async function TrendSparklineSection() {
  noStore();
  const studentId = await getSessionStudentId();
  if (!studentId) return null;

  const since = new Date(Date.now() - 14 * 86400000);
  const snaps = await prisma.progressSnap.findMany({
    where: { studentId, snapDate: { gte: since } },
    orderBy: { snapDate: "asc" },
    select: { subject: true, mastery: true, snapDate: true },
  });
  if (snaps.length === 0) return null;

  // Kelompokkan per subject, ambil titik terakhir per hari
  const bySubject = new Map<string, { date: string; mastery: number }[]>();
  for (const s of snaps) {
    const key = s.subject;
    const date = s.snapDate.toISOString().slice(0, 10);
    const arr = bySubject.get(key) ?? [];
    const existing = arr.find((a) => a.date === date);
    if (existing) existing.mastery = s.mastery;
    else arr.push({ date, mastery: Math.round(s.mastery * 100) });
    bySubject.set(key, arr);
  }

  const rows = Array.from(bySubject.entries())
    .map(([subject, arr]) => ({
      subject,
      points: arr.map((a) => a.mastery),
      latest: arr[arr.length - 1].mastery,
    }))
    .sort((a, b) => b.latest - a.latest)
    .slice(0, 4);

  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📈</span>
        <span className="font-bold text-base" style={{ fontFamily: "var(--font-st-display)" }}>
          Tren Penguasaan (14 hari)
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((r) => (
          <div
            key={r.subject}
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ backgroundColor: "var(--st-bg)" }}
          >
            <div className="min-w-0">
              <p className="font-semibold text-xs truncate">{r.subject}</p>
              <p className="text-[11px]" style={{ color: "var(--st-text-dim)" }}>
                {r.latest}% mastery
              </p>
            </div>
            <Sparkline points={r.points} color={SUBJECT_COLORS[r.subject] ?? "#8b5cf6"} />
          </div>
        ))}
      </div>
    </div>
  );
}
