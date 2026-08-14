import { PrismaClient } from '@prisma/client';
import { generateQuizContent } from '../src/agents/assessment/generator';

const prisma = new PrismaClient();

const HIGH_SEV_ITEMS = [
  "Permainan Bola Besar", "Permainan Bola Kecil", "Keberagaman SARA", 
  "Proklamasi", "Logika Matematika", "Sistem Respirasi", 
  "Tetapan Kesetimbangan (Kp dan Kc)", "Kekhasan Atom Karbon", 
  "Fluida", "Bilangan dan Operasi", "Hubungan Garis dan Sudut", 
  "Kosakata HSK 3.0 Level 1", "Fungsi Komposisi dan Invers", 
  "Menganalisis Kekalahan-Kekalahan Jepang"
];

async function regenerate() {
  console.log(`Starting targeted regeneration for ${HIGH_SEV_ITEMS.length} high-severity items...`);
  for (const topic of HIGH_SEV_ITEMS) {
    console.log(`Regenerating: ${topic}`);
    try {
      // Force regeneration with enhanced context
      await generateQuizContent("SMA_2", topic, true); 
      console.log(`✅ Success: ${topic}`);
    } catch (e: any) {
      console.error(`❌ Failed: ${topic}`, e.message);
    }
  }
  await prisma.$disconnect();
}

regenerate().catch(console.error);
