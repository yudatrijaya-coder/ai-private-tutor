/**
 * Attach the SIBI Ilmu Pengetahuan Sosial (IPS) SMP/MTs kelas VII book as a
 * source for Raihan's Geografi materials.
 *
 * SMP has no standalone Geografi textbook — Moodle course 4172 (Geografi VII A)
 * is completely empty, and the school's own Sejarah course links the IPS book
 * as the reference for the social-science subjects. The Geografi content lives
 * inside it:
 *
 *   Tema I-A  Mengenal Lokasi Tempat Tinggal   p4   -> letak, peta, kepulauan
 *   Tema I-B  Konektivitas Antarruang          p11  -> barang/jasa, penduduk
 *   Tema I-C  Perubahan Iklim                  p19  -> cuaca/iklim, vegetasi
 *   Tema I-D  Potensi Bencana Alam             p24  -> bencana, mitigasi
 *   Tema III-A Potensi Sumber Daya Alam        p108 -> SDA
 *
 * Writes `sourceUrls` only — content fields are untouched.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/attach-geografi-sibi.ts            # dry run
 *   node scripts/run-ts.mjs scripts/attach-geografi-sibi.ts --apply
 */
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

const STUDENT = "RAIHAN001";
const SUBJECT = "Geografi";

const SIBI_PAGE =
  "https://buku.kemendikdasmen.go.id/katalog/ilmu-pengetahuan-sosial-untuk-smp-mts-kelas-vii-edisi-revisi";
const SIBI_PDF =
  "https://static-sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/IPS_BS_KLS_VII_Rev.pdf";
const LOCAL = "/pdf-smp7/IPS_SMP7_BS.pdf";

/** material topic keyword -> printed page in the IPS book */
const SECTION: [RegExp, string][] = [
  [/letak geografis|astronomis/i, "Tema I-A, hlm. 4"],
  [/iklim|vegetasi/i, "Tema I-C, hlm. 19"],
  [/dataran|perairan/i, "Tema I-A, hlm. 4"],
  [/sumber daya alam/i, "Tema III-A, hlm. 108"],
  [/bencana|mitigasi/i, "Tema I-D, hlm. 24"],
  [/kepulauan|laut/i, "Tema I-A, hlm. 4"],
  [/ruang|lingkungan/i, "Tema II-A, hlm. 65"],
  [/penduduk/i, "Tema I-B, hlm. 11"],
  [/barang dan jasa/i, "Tema I-B, hlm. 11"],
  [/peta|atlas|globe/i, "Tema I-A, hlm. 4"],
];

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const student = await prisma.student.findUnique({
    where: { studentId: STUDENT },
    select: { id: true, name: true },
  });
  if (!student) throw new Error(`student ${STUDENT} not found`);

  const cid = await getActiveCurriculumId(student.id);
  if (!cid) throw new Error("no active curriculum");

  const rows = await prisma.material.findMany({
    where: { curriculumId: cid, subject: SUBJECT },
    select: { id: true, topic: true, subTopic: true, sourceUrls: true },
    orderBy: { weekOrder: "asc" },
  });

  console.log(`${student.name} (${STUDENT}) — ${SUBJECT} — active ${cid}`);
  console.log(`${rows.length} materials\n`);

  let touched = 0;
  for (const m of rows) {
    const label = `${m.topic}${m.subTopic ? ` / ${m.subTopic}` : ""}`;
    const hit = SECTION.find(([re]) => re.test(label));
    const where = hit ? hit[1] : "Tema I-A, hlm. 4";

    const existing: string[] = (() => {
      try {
        const v = JSON.parse(m.sourceUrls ?? "[]");
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    })();
    if (existing.includes(SIBI_PAGE)) {
      console.log(`  skip   w      ${label}  (already tagged)`);
      continue;
    }

    const next = [...existing, SIBI_PAGE];
    console.log(`  ${apply ? "TAG " : "DRY "}  ${label}`);
    console.log(`         -> ${where}  [${next.length} source(s)]`);
    if (apply) {
      await prisma.material.update({
        where: { id: m.id },
        data: { sourceUrls: JSON.stringify(next) },
      });
    }
    touched += 1;
  }

  console.log(`\n${apply ? "tagged" : "would tag"}: ${touched}/${rows.length}`);
  console.log(`SIBI page : ${SIBI_PAGE}`);
  console.log(`SIBI PDF  : ${SIBI_PDF}`);
  console.log(`local copy: ${LOCAL}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
