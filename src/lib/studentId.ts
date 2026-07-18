import { prisma } from "@/lib/prisma";

/** Generate next studentId: e.g. RUDI001, SYIFA001 */
export async function generateStudentId(name: string): Promise<string> {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 6)
    .padEnd(3, "X");
  
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
