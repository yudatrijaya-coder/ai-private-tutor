/**
 * Live check over real HTTP against the running server.
 *
 * The unit checks prove the banks are complete, but the banks only matter at
 * regenerate time — live pages read the stored materials. So this drives the
 * real path: sign in as admin, create a throwaway student, call
 * `/api/curriculum/regenerate` the way the dashboard does, then read one of the
 * materials it produced through `/api/students/material/[id]`.
 *
 * Usage: node scripts/run-ts.mjs scripts/verify-live-http.ts
 */
import { readFileSync } from "node:fs";
import { encode } from "@auth/core/jwt";
import { prisma } from "@/lib/prisma";
import { replaceCurriculumForStudent } from "@/agents/curriculum";

const BASE = process.env.LIVE_BASE ?? "https://senangbelajar.web.id";

function env(key: string): string {
  const line = readFileSync(".env", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`missing ${key} in .env`);
  return line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim();
}

async function adminCookie(): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? env("NEXTAUTH_SECRET");
  const admin = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true, email: true, name: true } });
  if (!admin) throw new Error("no admin user in DB");

  // Auth.js derives the JWE key from (secret, cookie name), and over HTTPS the
  // cookie is the `__Secure-` variant. Both the name and the salt must match, so
  // probe the two shapes and keep whichever the server accepts.
  const names = ["__Secure-authjs.session-token", "authjs.session-token"];
  for (const name of names) {
    const token = await encode({
      token: { sub: admin.id, email: admin.email, name: admin.name },
      secret,
      salt: name,
    });
    const cookie = `${name}=${token}`;
    const probe = await fetch(`${BASE}/api/curriculum/regenerate`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({}),
    });
    console.log(`  cookie ${name} → probe ${probe.status}`);
    if (probe.status !== 401) return cookie;
  }
  throw new Error("no cookie shape accepted by the server");
}

async function main(): Promise<void> {
  const problems: string[] = [];
  const cookie = await adminCookie();
  console.log(`cookie minted for admin (len ${cookie.length})`);

  const sid = "ZZTEST_LIVE";
  for (const stale of await prisma.student.findMany({ where: { studentId: sid }, select: { id: true } })) {
    await replaceCurriculumForStudent(stale.id, { allowSupercede: true }).catch(() => {});
    await prisma.curriculum.deleteMany({ where: { studentId: stale.id } }).catch(() => {});
    await prisma.student.delete({ where: { id: stale.id } }).catch(() => {});
  }
  const student = await prisma.student.create({
    data: { studentId: sid, name: "Live Probe", gradeLevel: "SMA_2", status: "TRIAL" },
  });

  try {
    // ── 1. regenerate over HTTP ──
    const res = await fetch(`${BASE}/api/curriculum/regenerate`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ studentId: student.id }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    console.log(`POST /api/curriculum/regenerate → ${res.status} ${JSON.stringify(body).slice(0, 240)}`);
    if (res.status !== 200) problems.push(`regenerate returned ${res.status}`);

    // ── 2. read a produced material over HTTP ──
    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: { id: true, version: true },
    });
    if (!curriculum) throw new Error("no curriculum after HTTP regenerate");
    console.log(`curriculum v${curriculum.version} id=${curriculum.id}`);

    const materials = await prisma.material.findMany({
      where: { curriculumId: curriculum.id },
      select: { id: true, subject: true, topic: true, subTopic: true },
      take: 400,
    });
    const sample = [materials[0], materials[Math.floor(materials.length / 2)], materials[materials.length - 1]];

    for (const m of sample) {
      if (!m) continue;
      const r = await fetch(`${BASE}/api/students/material/${m.id}`, { headers: { cookie } });
      const text = await r.text();
      // The route returns `slides` = resolveSlideMarkdown(metadata), the same
      // call the student's slide page makes — so a non-empty `slides` here is
      // exactly what the student would see.
      const slide = (() => {
        try {
          const j = JSON.parse(text) as Record<string, unknown>;
          const s = j.slides;
          return { len: typeof s === "string" ? s.length : 0 };
        } catch {
          return { len: 0 };
        }
      })();
      console.log(
        `GET material → ${r.status}  ${m.subject} / ${m.subTopic || m.topic}  slides=${slide.len} chars`,
      );
      if (r.status !== 200) problems.push(`material ${m.id} returned ${r.status}`);
      if (slide.len === 0) problems.push(`material ${m.subject}/${m.topic} has empty slides over HTTP`);
    }

    // ── 3. an unauthenticated call must still be refused ──
    const anon = await fetch(`${BASE}/api/students/material/${sample[0]?.id ?? "x"}`);
    console.log(`GET material without cookie → ${anon.status} (must be 401/403)`);
    if (anon.status !== 401 && anon.status !== 403) problems.push(`unauthenticated read returned ${anon.status}`);
  } finally {
    await replaceCurriculumForStudent(student.id, { allowSupercede: true }).catch(() => {});
    await prisma.curriculum.deleteMany({ where: { studentId: student.id } }).catch(() => {});
    await prisma.student.delete({ where: { id: student.id } }).catch(() => {});
  }

  // ── 4. the repaired quizzes must render over the real HTTP API ────────
  // This is the check that matters for the stub repair: a question that exists
  // in the database but cannot be turned into a payload is still invisible to
  // the student.
  //
  // Note the route deliberately WITHHOLDS `correctIndex` (the answer key must
  // not reach the client before submission), so `questionRejection` — which
  // requires a valid key — cannot be applied to this payload. What is asserted
  // here is what the student actually needs: a non-empty stem and real options.
  // Renderability in the full sense is covered by audit-quiz-integrity.ts.
  {
    // Ids come in two shapes in this database: uuid and bare 32-hex, so match
    // on the hex prefix rather than assuming a dash follows it.
    const prefixes = [
      "8076ae81", "b26cc302", "a44396af", "79bb5d34", "1f423b30", "f661cc07", // SMP_1
      "7c95622c", // SD_5 (Syifa)
      "894231be", // SMA_2 — the quiz generated for the repaired orphan material
    ];
    for (const prefix of prefixes) {
      const quiz = await prisma.quiz.findFirst({
        where: { id: { startsWith: prefix } },
        select: { id: true },
      });
      if (!quiz) {
        problems.push(`repaired quiz ${prefix} not found`);
        continue;
      }
      const r = await fetch(`${BASE}/api/students/quizzes/${quiz.id}`, { headers: { cookie } });
      const body = await r.text();
      let rendered = 0;
      let bad = 0;
      try {
        const j = JSON.parse(body) as Record<string, unknown>;
        const wrap = (j.quiz ?? j) as Record<string, unknown>;
        const qs = (Array.isArray(wrap.questions) ? wrap.questions : []) as Record<string, unknown>[];
        rendered = qs.length;
        bad = qs.filter((q) => {
          const stem = typeof q.question === "string" ? q.question.trim() : "";
          const opts = Array.isArray(q.options) ? q.options.filter((o) => typeof o === "string" && o.trim()) : [];
          return stem.length === 0 || opts.length < 2;
        }).length;
      } catch {
        problems.push(`quiz ${prefix} returned unparseable body`);
      }
      console.log(`GET quiz → ${r.status}  ${prefix}  questions=${rendered} unrenderable=${bad}`);
      if (r.status !== 200) problems.push(`quiz ${prefix} returned ${r.status}`);
      if (rendered === 0) problems.push(`quiz ${prefix} served zero questions over HTTP`);
      if (bad > 0) problems.push(`quiz ${prefix} still serves ${bad} question(s) without stem or options`);
    }
  }

  console.log("");
  if (problems.length) for (const p of problems) console.log(`FAIL ${p}`);
  console.log(problems.length ? "FAIL" : "PASS");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
