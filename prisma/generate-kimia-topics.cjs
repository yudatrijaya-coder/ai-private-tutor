// Generate Kimia topics using callLLM helper
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { callLLM } = require("../src/lib/llm.cjs");

async function main() {
  const result = await callLLM([
    { role: "system", content: "Kamu adalah ahli kurikulum Kimia SMA Kurikulum Merdeka. Berikan daftar topik Kimia SMA Kelas XI (Fase F) dalam format JSON array of objects: {subject:\"Kimia\", topic:\"...\", subTopic:\"...\"}. Fase F mencakup kelas XI. Berikan 3 bab utama dengan 3 sub-topik per bab. Hanya output JSON tanpa markdown." },
    { role: "user", content: "Topik Kimia Fase F Kurikulum Merdeka untuk kelas SMA XI:" },
  ], { temperature: 0.3 });
  console.log(result);
}

main().catch(console.error);
