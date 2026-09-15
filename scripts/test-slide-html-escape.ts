import { renderSlideMarkdown, escapeHtml } from "../src/lib/slide-html";

/**
 * Slide rendering: untrusted content must not become live DOM.
 *
 * WHY THIS TEST EXISTS
 * The student slide viewer and the admin preview both rendered slide text with
 * `dangerouslySetInnerHTML` through a hand-rolled markdown chain that did not
 * escape its input. Slide text arrives from LLM output and from scraped
 * SIBI/Moodle content, so the escape was load-bearing.
 *
 * Two things are asserted, and the second matters as much as the first:
 *
 *   1. A payload cannot produce an executable element or event attribute.
 *   2. Benign slides render EXACTLY as they did before the fix, compared
 *      against the previous algorithm inlined below as an oracle. Escaping is
 *      a one-character mistake away from showing students `&lt;br&gt;` and raw
 *      asterisks, so "it is safe" is not enough — it has to still look right.
 *
 * Run: npx tsx scripts/test-slide-html-escape.ts
 */

let pass = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ❌ ${label}${detail ? `  — ${detail}` : ""}`);
  }
}

const ACCENT = "#818cf8";

/* ── Oracle: the exact algorithm each page used before the fix ─────────── */

function oldStudentRender(slide: string, accent: string): string {
  return slide
    .replace(/^##\s+(.+)/gm, (_, t: string) => {
      const emojiMatch = t.match(/^([\u{1F000}-\u{1FFFF}])\s*/u);
      const emoji = emojiMatch ? emojiMatch[1] : "";
      const text = emojiMatch ? t.slice(emojiMatch[0].length) : t;
      const finalText = text || t;
      return `<div class="flex items-center gap-3 mb-6"><span class="text-4xl">${emoji || "📖"}</span><h2 class="text-2xl font-extrabold tracking-tight" style="color:${accent}">${finalText}</h2></div>`;
    })
    .replace(/^#\s+(.+)/gm, '<h1 class="text-3xl font-extrabold mb-4 text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold" style="color:#fff">$1</strong>')
    .replace(/^-\s+(.+)/gm, '<div class="flex items-start gap-2 mb-2"><span class="text-lg shrink-0 mt-0.5">•</span><span class="text-base">$1</span></div>')
    .replace(/^\d\.\s+(.+)/gm, '<div class="flex items-start gap-2 mb-2"><span class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span><span class="text-base">$1</span></div>')
    .replace(/\n---\n?/g, "").replace(/\n{3,}/g, "\n\n").replace(/\n\n/g, '</div><div class="space-y-3 mt-4">').replace(/\n/g, "<br/>");
}

function oldPreviewRender(slide: string, accent: string): string {
  return slide
    .replace(/^##\s+(.+)/gm, "")
    .replace(/^#\s+(.+)/gm, "")
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:white">$1</strong>')
    .replace(/\n- (.+)/g, '<div class="flex items-start gap-3 mb-2"><span class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style="background:' + accent + '"></span><span>$1</span></div>')
    .replace(/\n---\n?/g, "")
    .replace(/\n\n/g, '<div class="h-4"></div>')
    .replace(/\n/g, "<br/>");
}

/* ── 1. Benign content renders byte-identically to the old algorithm ───── */

const BENIGN = `## 📖 Sistem Pernapasan

**Bernapas** adalah proses menghirup oksigen.

- Hidung menyaring udara
- Trakea meneruskan udara
1. Inspirasi
2. Ekspirasi

Fotosintesis menulis reaksi sebagai 6CO2 + 6H2O.

---

Trakea punya cincin tulang rawan.`;

console.log("── benign content is unchanged (no visual regression) ──");
{
  const now = renderSlideMarkdown(BENIGN, { accent: ACCENT, mode: "decorated" });
  const then = oldStudentRender(BENIGN, ACCENT);
  check(
    "decorated mode matches the previous renderer exactly",
    now === then,
    now === then ? "" : `\n      now : ${now.slice(0, 160)}\n      then: ${then.slice(0, 160)}`,
  );
}
{
  const now = renderSlideMarkdown(BENIGN, { accent: ACCENT, mode: "plain" });
  const then = oldPreviewRender(BENIGN, ACCENT);
  check(
    "plain mode matches the previous renderer exactly",
    now === then,
    now === then ? "" : `\n      now : ${now.slice(0, 160)}\n      then: ${then.slice(0, 160)}`,
  );
}

console.log("\n── markdown still renders ──");
{
  const d = renderSlideMarkdown(BENIGN, { accent: ACCENT, mode: "decorated" });
  check("## becomes a decorated heading", d.includes("<h2") && d.includes("Sistem Pernapasan"));
  check("** becomes <strong>", d.includes('<strong class="font-bold"'));
  check("- becomes a bullet row", d.includes(">•</span>"));
  check("1. becomes a numbered row", d.includes('>1</span>'));
  const p = renderSlideMarkdown(BENIGN, { accent: ACCENT, mode: "plain" });
  check("plain mode drops the heading text", !p.includes("Sistem Pernapasan"));
  check("plain mode keeps <strong>", p.includes('<strong style="color:white">'));
}

/* ── 2. Payloads cannot produce an executable element or attribute ─────── */

const PAYLOADS: [string, string][] = [
  ["img onerror", `<img src=x onerror=alert(1)>`],
  ["script tag", `<script>alert(document.cookie)</script>`],
  ["svg onload", `<svg onload=alert(1)>`],
  ["iframe", `<iframe src="https://evil.example"></iframe>`],
  ["attribute break-out", `"><img src=x onerror=alert(1)>`],
  ["javascript: url", `<a href="javascript:alert(1)">click</a>`],
  ["body onload", `<body onload=alert(1)>`],
  ["style expression", `<div style="background:url(javascript:alert(1))">x</div>`],
];

const EXECUTABLE = [
  "<img", "<script", "<svg", "<iframe", "<body", "<a ", "<div style",
];

console.log("\n── payloads are neutralised ──");
for (const mode of ["decorated", "plain"] as const) {
  for (const [name, payload] of PAYLOADS) {
    const out = renderSlideMarkdown(payload, { accent: ACCENT, mode });
    const live = EXECUTABLE.filter((tag) => out.toLowerCase().includes(tag));
    const eventAttr = /<[a-z][^>]*\son[a-z]+\s*=/i.test(out);
    check(
      `${mode}: ${name} produces no live element`,
      live.length === 0 && !eventAttr,
      live.length ? `found ${live.join(", ")}` : "event attribute survived",
    );
  }
}

console.log("\n── the payload is shown as text, not silently dropped ──");
{
  const out = renderSlideMarkdown("<script>alert(1)</script>", { accent: ACCENT, mode: "decorated" });
  check(
    "escaped angle brackets remain visible",
    out.includes("&lt;script&gt;"),
    out.slice(0, 120),
  );
}

console.log("\n── a payload mixed with real markdown is still safe ──");
{
  const out = renderSlideMarkdown(`<img src=x onerror=alert(1)> **Penting**`, {
    accent: ACCENT,
    mode: "decorated",
  });
  check("bold still renders alongside a payload", out.includes("<strong"));
  check("the payload did not become an element", !out.toLowerCase().includes("<img"));
}

/* ── 3. <br> keeps its meaning without keeping its tag ─────────────────── */

console.log("\n── <br> is treated as a line break, not markup ──");
for (const [name, variant] of [
  ["<br>", "<br>"],
  ["<br/>", "<br/>"],
  ["<BR>", "<BR>"],
  ["<br />", "<br />"],
] as const) {
  const out = renderSlideMarkdown(`baris satu${variant}baris dua`, { accent: ACCENT, mode: "decorated" });
  check(
    `${name} becomes a real line break`,
    out.includes("<br/>") && !out.includes("&lt;br"),
    out.slice(0, 120),
  );
}

/* ── 4. escapeHtml itself ──────────────────────────────────────────────── */

console.log("\n── escapeHtml ──");
check("escapes & before < and >", escapeHtml("<a & b>") === "&lt;a &amp; b&gt;");
check("null and undefined become empty", escapeHtml(null) === "" && escapeHtml(undefined) === "");
check("plain text is untouched", escapeHtml("Fotosintesis 6CO2") === "Fotosintesis 6CO2");

console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
