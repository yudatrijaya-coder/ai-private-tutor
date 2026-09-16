import { BookMarked } from "lucide-react";

/**
 * Subject lists mirror the production database as of 2026-09-16
 * (Material.groupBy(gradeLevel, subject) — 7 SD / 15 SMP / 16 SMA).
 * Keep in sync when curriculum content is added or removed.
 */
const levels = [
  {
    grade: "SD",
    gradeCode: "SD_5",
    tagline: "Kelas 5",
    accent: "from-orange-400 to-amber-400",
    subjects: [
      "Matematika",
      "IPAS",
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Informatika",
      "Pendidikan Pancasila",
      "PJOK",
    ],
  },
  {
    grade: "SMP",
    gradeCode: "SMP_1",
    tagline: "Kelas 1 (VII)",
    accent: "from-teal-400 to-emerald-400",
    subjects: [
      "Matematika",
      "IPA",
      "Fisika",
      "Kimia",
      "Biologi",
      "IPS",
      "Sejarah",
      "Geografi",
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Bahasa Mandarin",
      "Informatika",
      "Pendidikan Pancasila",
      "Pendidikan Agama Islam",
      "PJOK",
    ],
  },
  {
    grade: "SMA",
    gradeCode: "SMA_2",
    tagline: "Kelas 2 (XI)",
    accent: "from-violet-400 to-indigo-400",
    subjects: [
      "Matematika",
      "Matematika Tingkat Lanjut",
      "Matematika Penalaran",
      "Fisika",
      "Kimia",
      "Biologi",
      "Ekonomi",
      "Sosiologi",
      "Sejarah",
      "Geografi",
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Bahasa Mandarin",
      "Informatika",
      "Pendidikan Pancasila",
      "PJOK",
    ],
  },
];

export default function Curriculum() {
  return (
    <section id="kurikulum" className="bg-white px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
            <BookMarked size={15} />
            Kurikulum
          </span>
          <h2 className="mt-4 text-3xl font-bold text-[#292524] [font-family:var(--font-display)] md:text-4xl">
            Mapel yang tersedia
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#78716c]">
            Materi disusun mengikuti Kurikulum Merdeka. Setiap mapel punya kuis,
            peta materi, dan video penjelasan — lengkap dengan jalur belajar bertingkat.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {levels.map((lvl) => (
            <div
              key={lvl.gradeCode}
              className="flex flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
            >
              <div className={`bg-gradient-to-r ${lvl.accent} px-6 py-5 text-white`}>
                <p className="text-2xl font-extrabold [font-family:var(--font-display)]">
                  {lvl.grade}
                </p>
                <p className="text-sm text-white/90">{lvl.tagline}</p>
              </div>
              <div className="flex-1 p-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#a8a29e]">
                  {lvl.subjects.length} mata pelajaran
                </p>
                <ul className="flex flex-wrap gap-2">
                  {lvl.subjects.map((s) => (
                    <li
                      key={s}
                      className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-[#b45309]"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[#a8a29e]">
          Materi terus bertambah. Mapel di luar daftar ini bisa diajukan lewat
          chat ke Kakak AI.
        </p>
      </div>
    </section>
  );
}
