/**
 * Regression test for the "kakak nggak bisa jelasin" bug.
 *
 * Root cause: the tutor fallback chain (ai_tutor_agent → hermes) uses REASONING
 * models. They emit hidden reasoning tokens BEFORE any content. explainQuizTopic
 * and the proactive evaluator passed tiny maxTokens caps (500 / 220), so the
 * whole budget was consumed by reasoning and the API returned
 * finish_reason="length" with EMPTY content. callLLM returned "" and the handler
 * showed the student a "nggak bisa jelasin" apology.
 *
 * These tests pin the three fixes:
 *   1. explainQuizTopic requests >= 1500 tokens.
 *   2. the proactive evaluator requests >= 800 tokens.
 *   3. callLLM treats an empty completion as a failure (so it fails over to the
 *      next model instead of returning "").
 *
 * Static checks (1 & 2) run offline; (3) hits the real 9Router and is skipped
 * when it is unreachable.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { callLLM } from "../src/llm/client";

/** Quick reachability probe — 9Router lives at LLM_BASE_URL (default :20128). */
async function routerReachable(): Promise<boolean> {
  const base = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
  try {
    const res = await fetch(`${base}/models`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const QUIZ_SRC = readFileSync(
  join(import.meta.dirname ?? __dirname, "../src/bot/handlers/quiz.ts"),
  "utf8",
);
const CLIENT_SRC = readFileSync(
  join(import.meta.dirname ?? __dirname, "../src/llm/client.ts"),
  "utf8",
);

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n── 1. Token budget explainQuizTopic ──");
{
  // Grab the maxTokens that sits inside the explain prompt block.
  const explainBlock = QUIZ_SRC.slice(
    QUIZ_SRC.indexOf("async function explainQuizTopic"),
    QUIZ_SRC.indexOf("async function recordAnswer"),
  );
  const m = explainBlock.match(/maxTokens:\s*(\d+)/);
  const val = m ? Number(m[1]) : 0;
  check("explainQuizTopic memakai maxTokens >= 1500", val >= 1500, `dapat ${val}`);
}

console.log("\n── 2. Token budget evaluasi proaktif ──");
{
  const evalBlock = QUIZ_SRC.slice(QUIZ_SRC.indexOf("buildProactiveEvaluation"));
  // The LAST maxTokens in the file belongs to the evaluator (it is defined last).
  const all = [...QUIZ_SRC.matchAll(/maxTokens:\s*(\d+)/g)];
  const val = all.length ? Number(all[all.length - 1][1]) : 0;
  check("evaluasi proaktif memakai maxTokens >= 800", val >= 800, `dapat ${val}`);
  check("blok evaluasi ditemukan", evalBlock.length > 0);
}

console.log("\n── 3. callLLM menolak completion kosong ──");
{
  check(
    "callLLM memeriksa content kosong",
    /content\.trim\(\)\s*===\s*""/.test(CLIENT_SRC),
  );
  check(
    "empty completion melempar error (bukan return \"\")",
    /empty completion \(finish_reason/.test(CLIENT_SRC),
  );
}

console.log("\n── 4. Live: konten kosong kini di-failover, bukan dikembalikan ──");
async function main() {
  if (await routerReachable()) {
    // A tiny cap on a reasoning model reproduces the empty completion. With the
    // fix, callLLM must NOT hand back "" — it either fails over to a model that
    // answered, or throws after exhausting the chain.
    let result: string | null = null;
    let threw = false;
    try {
      result = await callLLM(
        "tutor",
        [{ role: "user", content: "Jelaskan apa itu air dalam satu kalimat." }],
        { maxTokens: 40 },
      );
    } catch {
      threw = true;
    }
    const emptyStringReturned = result !== null && result.trim() === "";
    check(
      "tidak pernah mengembalikan string kosong",
      !emptyStringReturned,
      threw ? "melempar error (boleh)" : `len=${result?.length ?? "null"}`,
    );
  } else {
    console.log("  ⏭️  9Router tidak terjangkau — tes live dilewati");
  }

  console.log(
    `\n${fail === 0 ? "✅ ALL PASS" : "❌ ADA YANG GAGAL"} — ${pass} passed, ${fail} failed\n`,
  );
  process.exit(fail === 0 ? 0 : 1);
}

void main();
