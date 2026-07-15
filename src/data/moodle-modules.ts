/**
 * Mapping subject → internal Moodle module files (PDFs from Program Semester, Modul, dll)
 * These are files downloaded from Moodle internal (not SIBI)
 * 
 * Paths relative to /moodle-files/ which is served statically by Next.js
 */
export const MOODLE_MODULES: Record<string, Record<string, string[]>> = {
  SMP_1: {
    "Fisika": [
      "/moodle-files/Modul Physics VII semester ganjil (2).pdf",
      "/moodle-files/bab-1-besaran-pengukuran 2.pdf",
    ],
    "Kimia": [
      "/moodle-files/MOODLE-Hakikat Ilmu Kimia dan Metode Ilmiah.pdf",
    ],
    "Bahasa Indonesia": [
      "/moodle-files/Bahasa_Indonesia_BS_KLS_VII_Rev.pdf",
    ],
  },
};

/**
 * Get moodle module URLs for a subject+grade
 */
export function getMoodleModule(
  subject: string,
  gradeLevel?: string
): { url: string; label: string }[] | null {
  if (!gradeLevel) return null;
  const gradeMap = MOODLE_MODULES[gradeLevel];
  if (!gradeMap) return null;
  const files = gradeMap[subject];
  if (!files || files.length === 0) return null;
  return files.map((f) => ({
    url: f,
    label: f.split("/").pop()?.replace(/\.pdf$/, "").replace(/[_\-]/g, " ") ?? "Modul",
  }));
}

/**
 * Check if any moodle module exists for this grade level (for dashboard random pick)
 */
export function getRandomMoodleModule(gradeLevel?: string): { url: string; subject: string } | null {
  if (!gradeLevel) return null;
  const gradeMap = MOODLE_MODULES[gradeLevel];
  if (!gradeMap) return null;
  const subjects = Object.keys(gradeMap);
  if (subjects.length === 0) return null;
  const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
  const files = gradeMap[randomSubject];
  if (!files || files.length === 0) return null;
  return { url: files[0], subject: randomSubject };
}
