/**
 * Seed Badge catalogue. Run once after migration.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "ai_private_tutor",
  user: "tutor",
  password: "tutor123",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BADGES = [
  { code: "first_quiz",     name: "Quiz Pertama!",     description: "Menyelesaikan quiz pertama",          icon: "🎯", category: "milestone",  xpReward: 50,  threshold: 1 },
  { code: "quiz_10",        name: "Rajin Quiz",        description: "Menyelesaikan 10 quiz",               icon: "📝", category: "milestone",  xpReward: 100, threshold: 10 },
  { code: "quiz_50",        name: "Gila Quiz",          description: "Menyelesaikan 50 quiz",               icon: "🔥", category: "milestone",  xpReward: 250, threshold: 50 },
  { code: "streak_3",       name: "Semangat 3 Hari",    description: "Belajar 3 hari berturut-turut",        icon: "⭐", category: "streak",     xpReward: 30,  threshold: 3 },
  { code: "streak_7",       name: "Sepekan Penuh",       description: "Belajar 7 hari berturut-turut",        icon: "💪", category: "streak",     xpReward: 100, threshold: 7 },
  { code: "streak_30",      name: "Bulan Ini Milikku",  description: "Belajar 30 hari berturut-turut",       icon: "🏆", category: "streak",     xpReward: 500, threshold: 30 },
  { code: "mastery_matematika", name: "Master Matematika", description: "Kuasi semua topik Matematika",     icon: "🧮", category: "mastery",    xpReward: 200, threshold: null },
  { code: "mastery_ipa",    name: "Sainstis Cilik",     description: "Kuasi semua topik IPA",               icon: "🔬", category: "mastery",    xpReward: 200, threshold: null },
  { code: "mastery_ips",    name: "Jelajah Dunia",      description: "Kuasi semua topik IPS",               icon: "🌍", category: "mastery",    xpReward: 200, threshold: null },
  { code: "score_100",      name: "Sempurna!",          description: "Dapat skor 100 di quiz",              icon: "💯", category: "milestone",  xpReward: 100, threshold: null },
  { code: "exam_complete",  name: "Ujian Berlalu",      description: "Menyelesaikan ujian (simulasi)",       icon: "📚", category: "milestone",  xpReward: 150, threshold: 1 },
  { code: "slides_10",      name: "Pembaca Aktif",      description: "Membaca 10 slide materi",             icon: "📖", category: "consistency", xpReward: 20,  threshold: 10 },
  { code: "videos_5",       name: "Cinelearn",          description: "Menonton 5 video pembelajaran",       icon: "🎬", category: "consistency", xpReward: 30,  threshold: 5 },
  { code: "mindmap_5",      name: "Pemeta Hebat",       description: "Membuka 5 peta pikiran (mindmap)",     icon: "🗺️", category: "consistency", xpReward: 25,  threshold: 5 },
];

async function main() {
  console.log(`Seeding ${BADGES.length} badges...`);
  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: { name: b.name, description: b.description, icon: b.icon, category: b.category, xpReward: b.xpReward, threshold: b.threshold },
      create: b,
    });
  }
  const count = await prisma.badge.count();
  console.log(`Done. ${count} badges in database.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
