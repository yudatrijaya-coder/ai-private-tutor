import { prisma } from "@/lib/prisma";

/**
 * Generate next studentId: e.g. RUDI001, RAIHAN001, SALSA001
 *
 * Rules:
 * - Base = uppercase + only A-Z (angka/huruf lain dibuang)
 * - Base max 6 chars — kalau nama > 6, dishortened ke 5 chars biar lebih natural
 *   (contoh: SALSABILA → SALSA, bukan SALSAB)
 * - Nomor urut 3 digit (001, 002, ...) — auto-increment per base
 * - Full format: BASE + 3 digit = max 9 chars (RAIHAN001)
 */
export async function generateStudentId(name: string): Promise<string> {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  // Shorten: if > 6 chars, ambil 5 huruf pertama (lebih natural)
  const base = cleaned.length > 6
    ? cleaned.substring(0, 5)
    : cleaned.substring(0, 6).padEnd(3, "X");

  // Cari nomor counter tertinggi untuk base ini
  const existing = await prisma.student.findMany({
    where: { studentId: { startsWith: base } },
    select: { studentId: true },
  });

  let maxNum = 0;
  for (const s of existing) {
    const numStr = s.studentId.slice(base.length);
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  return `${base}${String(maxNum + 1).padStart(3, "0")}`;
}
