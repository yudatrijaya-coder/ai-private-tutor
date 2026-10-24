// Seed character images
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const password = process.env.PGPASSWORD;
if (!password) {
  throw new Error("PGPASSWORD tidak diset — jalankan `set -a; source .env; set +a`");
}

const pool = new pg.Pool({
  host: process.env.PGHOST ?? "localhost",
  port: parseInt(process.env.PGPORT ?? "5432"),
  database: process.env.PGDATABASE ?? "ai_private_tutor",
  user: process.env.PGUSER ?? "tutor",
  password,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const characters = [
  { name: "Mbappe Action", theme: "football", fileName: "football-mbappe-action-nobg.png", urlPath: "/characters/football-mbappe-action-nobg.png" },
  { name: "Ronaldo Action", theme: "football", fileName: "football-ronaldo-action-nobg.png", urlPath: "/characters/football-ronaldo-action-nobg.png" },
  { name: "Messi Action", theme: "football", fileName: "football-messi-action-nobg.png", urlPath: "/characters/football-messi-action-nobg.png" },
  { name: "Lisa Full Body", theme: "kpop", fileName: "kpop-lisa-action-nobg.png", urlPath: "/characters/kpop-lisa-action-nobg.png" },
  { name: "Jennie Full Body", theme: "kpop", fileName: "kpop-jennie-action-nobg.png", urlPath: "/characters/kpop-jennie-action-nobg.png" },
  { name: "Jisoo Full Body", theme: "kpop", fileName: "kpop-jisoo-action-nobg.png", urlPath: "/characters/kpop-jisoo-action-nobg.png" },
];

async function main() {
  console.log("Seeding CharacterImage...");
  await prisma.characterImage.deleteMany();
  
  for (const c of characters) {
    await prisma.characterImage.create({ data: c });
    console.log(`  ✅ ${c.name} (${c.theme})`);
  }
  
  console.log(`\n${characters.length} characters seeded!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
