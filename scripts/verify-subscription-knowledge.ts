/**
 * Verify the subscription knowledge block reaches the tutor LLM.
 *
 * Imports the REAL prompt modules (both are dependency-free, so tsx can load
 * them without the Prisma client / @ alias issues). Replicates the exact
 * question the user reported and prints the model's answer.
 *
 * Run: npx tsx scripts/verify-subscription-knowledge.ts
 */
import { buildSubscriptionKnowledge } from "../src/data/subscription";
import { buildCapabilitiesPrompt } from "../src/bot/agent/capabilities";
import { PERSONAS } from "../src/bot/personas";

const URL = process.env.LLM_BASE_URL || "http://localhost:20128/v1/chat/completions";
const KEY = (process.env.LLM_API_KEY || "sk-9router").replace(/^["']|["']$/g, "");

const persona = PERSONAS.KAK_DEWI;

const knowledge = buildSubscriptionKnowledge({
  status: "TRIAL",
  trialEndsAt: new Date(Date.now() + 3 * 86_400_000),
  timezone: "Asia/Jakarta",
});

console.log("=========== INJECTED KNOWLEDGE BLOCK ===========");
console.log(knowledge);
console.log("=================================================\n");

const systemPrompt = [
  persona.prompt,
  "",
  "Student name: Tiumu",
  "Student ID: TIUMU001",
  "Grade: SMA Kelas 2",
  "",
  buildCapabilitiesPrompt(knowledge),
  "",
  "Respond in Indonesian, warm, friendly.",
].join("\n");

const QUESTIONS = [
  "kak aku mau extend akun aku gimana ya?",
  "cara upgrade gimana kak?",
  "berapa harga perpanjangnya?",
];

/** SSE-aware parse. NEVER split on "data:" — content can contain it. */
function parseStream(raw: string): string {
  const parts: string[] = [];
  for (const seg of raw.split(/(?=data:\s*)/)) {
    const trimmed = seg.replace(/^data:\s*/, "").trim();
    if (!trimmed || trimmed === "[DONE]") continue;
    try {
      const d = JSON.parse(trimmed);
      const payload = d.data ?? d;
      const delta = payload.choices?.[0]?.delta?.content;
      if (typeof delta === "string") { parts.push(delta); continue; }
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content === "string") parts.push(content);
    } catch {
      /* skip unparseable chunk */
    }
  }
  const joined = parts.join("");
  return joined || `[EMPTY PARSE] raw_len=${raw.length} raw=${raw.slice(0, 400)}`;
}

async function ask(question: string): Promise<string> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "hermes",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });
  return parseStream(await res.text());
}

(async () => {
  for (const q of QUESTIONS) {
    console.log("--- STUDENT:", q);
    console.log((await ask(q)).trim());
    console.log();
  }
})();
