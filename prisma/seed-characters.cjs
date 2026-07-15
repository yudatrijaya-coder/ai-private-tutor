#!/usr/bin/env node
// Seed character images into database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const characters = [
  // Football theme
  { name: "Mbappe Action", theme: "football", fileName: "football-mbappe-action-nobg.png", urlPath: "/characters/football-mbappe-action-nobg.png" },
  { name: "Ronaldo Action", theme: "football", fileName: "football-ronaldo-action-nobg.png", urlPath: "/characters/football-ronaldo-action-nobg.png" },
  { name: "Messi Action", theme: "football", fileName: "football-messi-action-nobg.png", urlPath: "/characters/football-messi-action-nobg.png" },
  // K-Pop theme
  { name: "Lisa Full Body", theme: "kpop", fileName: "kpop-lisa-action-nobg.png", urlPath: "/characters/kpop-lisa-action-nobg.png" },
  { name: "Jennie Full Body", theme: "kpop", fileName: "kpop-jennie-action-nobg.png", urlPath: "/characters/kpop-jennie-action-nobg.png" },
  { name: "Jisoo Full Body", theme: "kpop", fileName: "kpop-jisoo-action-nobg.png", urlPath: "/characters/kpop-jisoo-action-nobg.png" },
];

(async () => {
  await prisma.characterImage.deleteMany();
  
  for (const c of characters) {
    await prisma.characterImage.create({ data: c });
    console.log(`✅ ${c.name} (${c.theme})`);
  }
  
  console.log(`\n${characters.length} characters seeded!`);
  await prisma.$disconnect();
})();
