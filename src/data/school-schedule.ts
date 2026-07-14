/**
 * Jadwal sekolah asli dari portal SiKumbang.
 * Data di-scrape langsung dari https://si.kumbang.sch.id/
 *
 * Format: { [studentCode]: { [day]: { time: string, subject: string, room: string, teacher: string, linkZoom?: string }[] } }
 *
 * studentCode = kode unik yg ada di tabel Student (identifier)
 * Raihan → H4LX (dari STU_MRHLH4LX)
 * SHOFI → H0EX2D (dari SHOF_H0EX2D)
 */

export type SchoolScheduleEntry = {
  time: string;
  subject: string;
  room: string;
  teacher: string;
  linkZoom?: string;
};

export type DaySchedule = SchoolScheduleEntry[];

export type WeekSchedule = Record<string, DaySchedule>;

export type SchoolScheduleMap = Record<string, WeekSchedule>;

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

/**
 * Normalise nama hari untuk lookup.
 * API SiKumbang pakai "Jum'at" → simpan dgn kunci "Jumat".
 */
function normaliseDay(day: string): string {
  return day.replace(/[']/g, "").trim();
}

/**
 * Ambil jadwal untuk student berdasarkan kode student.
 * Fallback ke studentId jika kode tidak dikenal.
 */
export function getSchoolSchedule(
  studentCode: string,
): WeekSchedule | null {
  // Cari di map — cocokkan akhiran kode (case-insensitive)
  const key = Object.keys(SCHEDULE_MAP).find((k) =>
    studentCode.toUpperCase().includes(k.toUpperCase()),
  );
  if (!key) return null;
  return SCHEDULE_MAP[key];
}

/**
 * Ambil jadwal untuk hari tertentu.
 */
export function getDaySchedule(
  studentCode: string,
  day: string,
): DaySchedule | null {
  const week = getSchoolSchedule(studentCode);
  if (!week) return null;
  const normalised = normaliseDay(day);
  // Cari hari — cocokkan case-insensitive
  const dayKey = Object.keys(week).find(
    (k) => normaliseDay(k) === normalised,
  );
  return dayKey ? week[dayKey] : null;
}

/**
 * Apakah student punya data jadwal sekolah?
 */
export function hasSchoolSchedule(studentCode: string): boolean {
  return getSchoolSchedule(studentCode) !== null;
}

/**
 * Daftar hari yang ada jadwalnya.
 */
export function getAvailableDays(studentCode: string): string[] {
  const week = getSchoolSchedule(studentCode);
  if (!week) return [];
  return DAYS.filter((d) => {
    const s = getDaySchedule(studentCode, d);
    return s && s.length > 0;
  });
}

// ═══════════════════════════════════════════
// DATA JADWAL ASLI — SiKumbang
// ═══════════════════════════════════════════

const SCHEDULE_MAP: SchoolScheduleMap = {
  // ─── Raihan (SMP VII A) ───
  H4LX: {
    Senin: [
      { time: "07:00 - 07:40", subject: "Biologi", room: "Ruang Kelas", teacher: "Lucia Ermalina, S.Pd.", linkZoom: "https://meet.google.com/vvu-vato-sud" },
      { time: "07:40 - 08:20", subject: "Biologi", room: "Ruang Kelas", teacher: "Lucia Ermalina, S.Pd.", linkZoom: "https://meet.google.com/vvu-vato-sud" },
      { time: "09:00 - 09:40", subject: "Bahasa Inggris", room: "Ruang Kelas", teacher: "Nelprida Rajagukguk, S.Pd.", linkZoom: "https://meet.google.com/kgq-btgg-kpu" },
      { time: "09:40 - 10:20", subject: "Bahasa Inggris", room: "Ruang Kelas", teacher: "Nelprida Rajagukguk, S.Pd.", linkZoom: "https://meet.google.com/kgq-btgg-kpu" },
      { time: "11:00 - 11:40", subject: "Bahasa Mandarin", room: "Ruang Kelas", teacher: "Suryani S.Si" },
      { time: "11:40 - 12:20", subject: "Kimia", room: "Ruang Kelas", teacher: "Tiara Dwi Riski Nadia, S.Pd., M.Si." },
      { time: "13:00 - 13:35", subject: "Bahasa Indonesia", room: "Ruang Kelas", teacher: "Aucintia Agnes Romora Br. Manik, S.S., Gr." },
      { time: "13:35 - 14:10", subject: "Matematika Dasar", room: "Ruang Kelas", teacher: "Theresia Ispujiati, S.Si., M.Pd.", linkZoom: "https://meet.google.com/myz-igip-frx" },
    ],
    Selasa: [
      { time: "07:00 - 07:40", subject: "Bahasa Palembang", room: "Ruang Kelas", teacher: "Nurhikma Syanti, M.Pd.", linkZoom: "https://meet.google.com/aib-sjud-opo" },
      { time: "07:40 - 08:20", subject: "Bimbingan Konseling", room: "Ruang Kelas", teacher: "Vincentia Erica Tita S.Pd.,Gr." },
      { time: "09:00 - 09:40", subject: "PJOK", room: "Ruang Kelas", teacher: "Diah Rini Prasetyo, S.Pd.", linkZoom: "https://meet.google.com/dsy-maav-pjm" },
      { time: "09:00 - 09:40", subject: "PJOK", room: "Ruang Kelas", teacher: "Hara Fitriansyah S.", linkZoom: "https://meet.google.com/pmi-dror-hsz" },
      { time: "09:00 - 09:40", subject: "PJOK", room: "Ruang Kelas", teacher: "Vannesa Carolina" },
      { time: "09:00 - 09:40", subject: "PJOK", room: "Ruang Kelas", teacher: "Leon Gusrizan, M.Pd", linkZoom: "https://meet.google.com/egy-gcqn-zmi" },
      { time: "09:00 - 09:40", subject: "PJOK", room: "Ruang Kelas", teacher: "Dio Alfiansa" },
      { time: "09:00 - 09:40", subject: "PJOK", room: "Ruang Kelas", teacher: "Periyana Susanti", linkZoom: "https://meet.google.com/hfg-razv-fxz" },
      { time: "09:00 - 09:40", subject: "PJOK", room: "Ruang Kelas", teacher: "Relly Fajar Firsada, S.Pd", linkZoom: "https://meet.google.com/ssp-xbgh-uoo" },
      { time: "09:40 - 10:20", subject: "PJOK", room: "Ruang Kelas", teacher: "Diah Rini Prasetyo, S.Pd.", linkZoom: "https://meet.google.com/dsy-maav-pjm" },
    ],
    Rabu: [
      { time: "07:00 - 07:40", subject: "Life Skill", room: "Ruang Kelas", teacher: "Charles Sihombing, S.S.", linkZoom: "https://meet.google.com/ose-bcrw-dub" },
      { time: "07:40 - 08:20", subject: "Life Skill", room: "Ruang Kelas", teacher: "Charles Sihombing, S.S.", linkZoom: "https://meet.google.com/ose-bcrw-dub" },
      { time: "09:00 - 09:40", subject: "Matematika", room: "Ruang Kelas", teacher: "Fitriyanti, S.Pd.", linkZoom: "https://meet.google.com/ehi-tysv-idq" },
      { time: "09:40 - 10:20", subject: "Matematika", room: "Ruang Kelas", teacher: "Fitriyanti, S.Pd.", linkZoom: "https://meet.google.com/ehi-tysv-idq" },
      { time: "11:00 - 11:40", subject: "Pendidikan Pancasila dan Kewarganegaraan", room: "Ruang Kelas", teacher: "Eunike Simanjuntak, S.Pd" },
      { time: "11:40 - 12:20", subject: "Pendidikan Pancasila dan Kewarganegaraan", room: "Ruang Kelas", teacher: "Eunike Simanjuntak, S.Pd" },
      { time: "13:00 - 13:40", subject: "Geografi", room: "Ruang Kelas", teacher: "Elvita Safitri, S.Pd., M.Sc.", linkZoom: "https://meet.google.com/kog-edwe-qji" },
      { time: "13:40 - 14:20", subject: "Bahasa Inggris", room: "Ruang Kelas", teacher: "Nelprida Rajagukguk, S.Pd.", linkZoom: "https://meet.google.com/kgq-btgg-kpu" },
    ],
    Kamis: [
      { time: "07:00 - 07:40", subject: "Matematika", room: "Ruang Kelas", teacher: "Fitriyanti, S.Pd.", linkZoom: "https://meet.google.com/ehi-tysv-idq" },
      { time: "07:40 - 08:20", subject: "Matematika", room: "Ruang Kelas", teacher: "Fitriyanti, S.Pd.", linkZoom: "https://meet.google.com/ehi-tysv-idq" },
      { time: "09:00 - 09:40", subject: "Bahasa Indonesia", room: "Ruang Kelas", teacher: "Aucintia Agnes Romora Br. Manik, S.S., Gr." },
      { time: "09:40 - 10:20", subject: "Bahasa Indonesia", room: "Ruang Kelas", teacher: "Aucintia Agnes Romora Br. Manik, S.S., Gr." },
      { time: "11:00 - 11:40", subject: "Informatika", room: "Ruang Kelas", teacher: "Dony Fikri Akbar, S.Kom." },
      { time: "11:40 - 12:20", subject: "Informatika", room: "Ruang Kelas", teacher: "Dony Fikri Akbar, S.Kom." },
      { time: "13:00 - 13:40", subject: "Seni Budaya", room: "Ruang Kelas", teacher: "F.X. Abdullah Soleh, S.Pd.", linkZoom: "https://meet.google.com/aqj-gnrm-zcu" },
      { time: "13:00 - 13:40", subject: "Seni Budaya", room: "Ruang Kelas", teacher: "Dodi Pradana Putra, S.Pd.", linkZoom: "https://meet.google.com/edz-wzkq-kdq" },
      { time: "13:00 - 13:40", subject: "Seni Budaya", room: "Ruang Kelas", teacher: "M. Aditya Dwi Putra, S.Pd.", linkZoom: "https://meet.google.com/may-yxyv-stz" },
      { time: "13:00 - 13:40", subject: "Seni Budaya", room: "Ruang Kelas", teacher: "I Wayan Ayunita, S.Pd", linkZoom: "https://meet.google.com/ypg-bwgx-uhd" },
    ],
    Jumat: [
      { time: "07:00 - 07:40", subject: "Speaking Bahasa Inggris", room: "Ruang Kelas", teacher: "Kurt Serbus, B.A.", linkZoom: "https://meet.google.com/nfa-dpxb-ous" },
      { time: "07:40 - 08:20", subject: "Speaking Bahasa Inggris", room: "Ruang Kelas", teacher: "Kurt Serbus, B.A.", linkZoom: "https://meet.google.com/nfa-dpxb-ous" },
      { time: "09:00 - 09:35", subject: "Pendidikan Agama dan Budi Pekerti", room: "Ruang Kelas", teacher: "Drs. Kgs. Usman M.S., M.H., M.Pd." },
      { time: "09:35 - 10:10", subject: "Pendidikan Agama dan Budi Pekerti", room: "Ruang Kelas", teacher: "Drs. Kgs. Usman M.S., M.H., M.Pd." },
      { time: "10:10 - 10:45", subject: "Sejarah", room: "Ruang Kelas", teacher: "Charles Sihombing, S.S.", linkZoom: "https://meet.google.com/ose-bcrw-dub" },
      { time: "10:45 - 11:20", subject: "Sejarah", room: "Ruang Kelas", teacher: "Charles Sihombing, S.S.", linkZoom: "https://meet.google.com/ose-bcrw-dub" },
      { time: "13:20 - 14:00", subject: "Bahasa Indonesia", room: "Ruang Kelas", teacher: "Aucintia Agnes Romora Br. Manik, S.S., Gr." },
      { time: "14:00 - 14:40", subject: "Bahasa Indonesia", room: "Ruang Kelas", teacher: "Aucintia Agnes Romora Br. Manik, S.S., Gr." },
    ],
  },

  // ─── SHOFI (SMA XI 4) — FULL WEEK ───
  RHQL6KX: { // DB: STU_MRHQL6KX
    Senin: [
      { time: "07:00 - 07:40", subject: "Bahasa Inggris", room: "Ruang Kelas", teacher: "Tyani Alrizki, S.S." },
      { time: "07:40 - 08:20", subject: "Bahasa Inggris", room: "Ruang Kelas", teacher: "Tyani Alrizki, S.S." },
      { time: "08:20 - 09:00", subject: "PJOK", room: "Ruang Kelas", teacher: "Diah Rini Prasetyo, S.Pd." },
      { time: "08:20 - 09:00", subject: "PJOK", room: "Ruang Kelas", teacher: "Hara Fitriansyah S." },
      { time: "08:20 - 09:00", subject: "PJOK", room: "Ruang Kelas", teacher: "Vannesa Carolina" },
      { time: "08:20 - 09:00", subject: "PJOK", room: "Ruang Kelas", teacher: "Leon Gusrizan, M.Pd" },
      { time: "08:20 - 09:00", subject: "PJOK", room: "Ruang Kelas", teacher: "Dio Alfiansa" },
      { time: "08:20 - 09:00", subject: "PJOK", room: "Ruang Kelas", teacher: "Periyana Susanti" },
      { time: "08:20 - 09:00", subject: "PJOK", room: "Ruang Kelas", teacher: "Relly Fajar Firsada, S.Pd" },
      { time: "09:40 - 10:20", subject: "PJOK", room: "Ruang Kelas", teacher: "Diah Rini Prasetyo, S.Pd." },
    ],
    Selasa: [
      { time: "07:00 - 07:40", subject: "Fisika", room: "Ruang Kelas", teacher: "Yosef Indra Waluyo, SS" },
      { time: "07:40 - 08:20", subject: "Bahasa Indonesia", room: "Ruang Kelas", teacher: "Agus Noprianto, S.Pd." },
      { time: "08:20 - 09:00", subject: "Bahasa Indonesia", room: "Ruang Kelas", teacher: "Agus Noprianto, S.Pd." },
      { time: "09:40 - 10:20", subject: "Bahasa Inggris Tingkat Lanjut", room: "Ruang Kelas", teacher: "Salwa Damayanti, S.Pd." },
      { time: "10:20 - 11:00", subject: "Bahasa Inggris Tingkat Lanjut", room: "Ruang Kelas", teacher: "Salwa Damayanti, S.Pd." },
      { time: "11:40 - 12:20", subject: "Pendidikan Agama dan Budi Pekerti", room: "Ruang Kelas", teacher: "Yenny Ervan, S.Pd." },
      { time: "12:20 - 13:00", subject: "Pendidikan Agama dan Budi Pekerti", room: "Ruang Kelas", teacher: "Yenny Erviana, S.Pd." },
      { time: "13:00 - 13:35", subject: "Biologi", room: "Ruang Kelas", teacher: "Raka Pamungkas, S.Pd." },
      { time: "14:10 - 14:45", subject: "Matematika", room: "Ruang Kelas", teacher: "Dr. Viona Adelia, S.Pd." },
      { time: "14:45 - 15:20", subject: "Matematika Penalaran", room: "Ruang Kelas", teacher: "Dr. Viona Adelia, S.Pd." },
    ],
    Rabu: [
      { time: "07:00 - 07:40", subject: "Life Skill", room: "Ruang Kelas", teacher: "Penny Efrida Tariuli, S.Pd." },
      { time: "07:40 - 08:20", subject: "Life Skill", room: "Ruang Kelas", teacher: "Penny Efrida Tariuli, S.Pd." },
      { time: "08:20 - 09:00", subject: "Literasi dalam Bahasa Indonesia", room: "Ruang Kelas", teacher: "Agus Noprianto, S.Pd." },
      { time: "09:40 - 10:20", subject: "Kimia", room: "Ruang Kelas", teacher: "Rony M.S., S.Si." },
      { time: "10:20 - 11:00", subject: "Kimia", room: "Ruang Kelas", teacher: "Rony M.S., S.Si." },
      { time: "11:40 - 12:20", subject: "Matematika Tingkat Lanjut", room: "Ruang Kelas", teacher: "Santoso Suhendra, S.Si., M.Pd." },
      { time: "12:20 - 13:00", subject: "Matematika Tingkat Lanjut", room: "Ruang Kelas", teacher: "Santoso Suhendra, S.Si., M.Pd." },
      { time: "13:00 - 13:40", subject: "Bahasa Inggris", room: "Ruang Kelas", teacher: "Tyani Alrizki, S.S." },
      { time: "14:20 - 15:00", subject: "Fisika", room: "Ruang Kelas", teacher: "Yosef Indra Waluyo, SS" },
      { time: "15:00 - 15:40", subject: "Fisika", room: "Ruang Kelas", teacher: "Yosef Indra Waluyo, SS" },
    ],
    Kamis: [
      { time: "07:00 - 07:40", subject: "Literasi dalam Bahasa Indonesia", room: "Ruang Kelas", teacher: "Agus Noprianto, S.Pd." },
      { time: "07:40 - 08:20", subject: "Matematika Tingkat Lanjut", room: "Ruang Kelas", teacher: "Santoso Suhendra, S.Si., M.Pd." },
      { time: "08:20 - 09:00", subject: "Matematika Tingkat Lanjut", room: "Ruang Kelas", teacher: "Santoso Suhendra, S.Si., M.Pd." },
      { time: "09:40 - 10:20", subject: "Seni Tari", room: "Ruang Kelas", teacher: "I Wayan Ayunita, S.Pd." },
      { time: "10:20 - 11:00", subject: "Seni Tari", room: "Ruang Kelas", teacher: "I Wayan Ayunita, S.Pd." },
      { time: "11:40 - 12:20", subject: "Kimia", room: "Ruang Kelas", teacher: "Rony M.S., S.Si." },
      { time: "12:20 - 13:00", subject: "Kimia", room: "Ruang Kelas", teacher: "Rony M.S., S.Si." },
      { time: "13:00 - 13:40", subject: "Matematika Penalaran", room: "Ruang Kelas", teacher: "Dr. Viona Adelia, S.Pd." },
      { time: "14:20 - 15:00", subject: "Literasi dalam Bahasa Inggris", room: "Ruang Kelas", teacher: "Tyani Alrizki, S.S." },
      { time: "15:00 - 15:40", subject: "Literasi dalam Bahasa Inggris", room: "Ruang Kelas", teacher: "Tyani Alrizki, S.S." },
    ],
    Jumat: [
      { time: "07:00 - 07:40", subject: "Speaking Bahasa Inggris", room: "Ruang Kelas", teacher: "Stephen C. F.B." },
      { time: "07:40 - 08:20", subject: "Sejarah", room: "Ruang Kelas", teacher: "Penny Efrida Tariuli, S.Pd." },
      { time: "08:20 - 09:00", subject: "Sejarah", room: "Ruang Kelas", teacher: "Penny Efrida Tariuli, S.Pd." },
      { time: "09:35 - 10:10", subject: "Bahasa Mandarin", room: "Ruang Kelas", teacher: "Mego, B.A.Ed., M.Pd." },
      { time: "10:10 - 10:45", subject: "Pendidikan Pancasila", room: "Ruang Kelas", teacher: "Sih Mujiati, S.Pd." },
      { time: "10:45 - 11:20", subject: "Pendidikan Pancasila", room: "Ruang Kelas", teacher: "Sih Mujiati, S.Pd." },
      { time: "13:20 - 14:00", subject: "Biologi", room: "Ruang Kelas", teacher: "Raka Pamungkas, S.Pd." },
      { time: "14:00 - 14:40", subject: "Informatika", room: "Ruang Kelas", teacher: "Chiello Fielaycia, S.Kom." },
      { time: "14:40 - 15:20", subject: "Informatika", room: "Ruang Kelas", teacher: "Chiello Fielaycia, S.Kom." },
    ],
  },
};
