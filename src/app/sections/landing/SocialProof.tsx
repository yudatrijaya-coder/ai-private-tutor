import { BookOpen, ClipboardCheck, Clapperboard, GraduationCap } from "lucide-react";

/**
 * Real counts pulled from the production database on 2026-09-16:
 *   Material rows     1426  (SD_5: 130, SMP_1: 535, SMA_2: 761)
 *   Quiz rows         1446
 *   Exam rows           35
 *   Mapel x jenjang     38  (SD_5: 7, SMP_1: 15, SMA_2: 16)
 *
 * These are database figures, not customer or outcome claims. If the content
 * library grows substantially, update these numbers together.
 */
const stats = [
  {
    icon: BookOpen,
    value: "1.400+",
    label: "Materi pelajaran",
    sub: "SD, SMP, dan SMA",
  },
  {
    icon: ClipboardCheck,
    value: "1.400+",
    label: "Soal kuis interaktif",
    sub: "dengan umpan balik langsung",
  },
  {
    icon: GraduationCap,
    value: "38",
    label: "Mapel & jenjang",
    sub: "dari Matematika sampai PJOK",
  },
  {
    icon: Clapperboard,
    value: "24/7",
    label: "Kakak AI siap membantu",
    sub: "kapan pun anak belajar",
  },
];

export default function SocialProof() {
  return (
    <section className="border-y border-orange-100 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="mx-auto mb-3 inline-flex rounded-xl bg-orange-50 p-3 text-[#f97316]">
                <s.icon size={22} />
              </div>
              <p className="text-2xl font-extrabold text-[#292524] [font-family:var(--font-display)] md:text-3xl">
                {s.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#292524]">{s.label}</p>
              <p className="text-xs text-[#78716c]">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
