import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { parseMindmapFromMarkdown } from "@/lib/mindmap-template";
import { isUsableMindmap } from "@/lib/content/slide-content";

const STUDENT_ID = "e30b6559-1d33-4aa5-a39a-22102f29894d";
const SUBJECT = "Pendidikan Agama Islam";

async function main() {
  const curriculum = await prisma.curriculum.findFirstOrThrow({
    where: { studentId: STUDENT_ID }, orderBy: { version: "desc" },
    include: { materials: { where: { subject: SUBJECT }, orderBy: { weekOrder: "asc" } } },
  });
  if (curriculum.materials.length !== 10) throw new Error(`Expected 10 PAI materials, got ${curriculum.materials.length}`);

  for (const material of curriculum.materials) {
    const metadata = material.metadata as Record<string, unknown>;
    const slides = String(metadata.slide_sibi ?? metadata.slides ?? "");
    // The renderer's parser treats `##` as section roots. Generated slide decks
    // use `# Slide N`, so normalize only those headings before parsing.
    const mindmap = parseMindmapFromMarkdown(slides.replace(/^# Slide /gm, "## Slide "));
    if (!isUsableMindmap(mindmap)) throw new Error(`Unusable mindmap: ${material.topic}`);
    await prisma.material.update({
      where: { id: material.id },
      data: { metadata: { ...metadata, mindmap_sibi: mindmap } },
    });
    console.log(`OK ${material.weekOrder}/10 branches=${mindmap.length} ${material.topic}`);
  }
  await prisma.$disconnect();
}
main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
