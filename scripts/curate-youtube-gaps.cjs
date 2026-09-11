/**
 * Curate YouTube videos for topics that currently resolve to ZERO videos.
 *
 * Pipeline per gap topic:
 *   1. Innertube search   -> candidate videos (id, title, channel, duration)
 *   2. Topic-title gate   -> title must share keywords with the topic
 *   3. Level gate         -> title must not advertise a different school level
 *   4. Duration/format    -> drop shorts, viral clips, 4-hour streams
 *   5. oEmbed verify      -> link must resolve
 *   6. Retry with a tighter query when pass 1 yields nothing
 *
 * Output: /tmp/yt-candidates.json (proposal only — nothing written to src/data)
 *
 * Usage: node scripts/curate-youtube-gaps.cjs /tmp/all_zeros.json
 */

const https = require("https");
const fs = require("fs");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const LEVEL_LABEL = { SD_5: "5 SD", SMP_1: "7 SMP", SMA_2: "11 SMA" };
const LEVEL_QUERY = { SD_5: "SD kelas 5", SMP_1: "SMP kelas 7", SMA_2: "SMA kelas 11" };

function post(url, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": BROWSER_UA,
          "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: 20000,
      },
      (res) => {
        let out = "";
        res.on("data", (c) => (out += c));
        res.on("end", () => resolve(out));
      },
    );
    req.on("error", () => resolve(""));
    req.on("timeout", () => {
      req.destroy();
      resolve("");
    });
    req.write(data);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve) => {
    https
      .get(url, { timeout: 20000, headers: { "User-Agent": BROWSER_UA } }, (res) => {
        let out = "";
        res.on("data", (c) => (out += c));
        res.on("end", () => resolve(out));
      })
      .on("error", () => resolve(""))
      .on("timeout", function () {
        this.destroy();
        resolve("");
      });
  });
}

async function getCreds() {
  const html = await get("https://www.youtube.com");
  return {
    apiKey: html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] || "",
    clientVersion: html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || "2.20250213.05.00",
  };
}

async function search(query, creds) {
  const body = {
    context: {
      client: { clientName: "WEB", clientVersion: creds.clientVersion, hl: "id", gl: "ID" },
    },
    query,
  };
  const raw = await post(
    `https://www.youtube.com/youtubei/v1/search?key=${creds.apiKey}&prettyPrint=false`,
    body,
  );
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.videoRenderer) {
      const v = node.videoRenderer;
      out.push({
        videoId: v.videoId,
        title: v.title?.runs?.map((r) => r.text).join("") ?? "",
        channel: v.ownerText?.runs?.[0]?.text ?? "",
        duration: v.lengthText?.simpleText ?? "",
      });
    }
    for (const k of Object.keys(node)) walk(node[k]);
  };
  walk(json);
  return out;
}

async function oembed(videoId) {
  const raw = await get(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
  );
  try {
    const j = JSON.parse(raw);
    return { ok: true, title: j.title, channel: j.author_name };
  } catch {
    return { ok: false };
  }
}

const STOP = new Set([
  "dan","atau","yang","untuk","dengan","pada","dalam","dari","ke","di","the","of","and","for",
  "kelas","semester","bab","materi","level","tingkat","dasar","pengenalan","tentang","cara",
  "sistem","teks","bacaan","kosakata","soal","latihan",
]);

function tokens(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

// Words that reveal a different school level.
function levelVerdict(grade, title, channel) {
  const t = (title + " " + channel).toLowerCase();
  const sma = /\b(sma|ma|smk|kelas\s*(10|11|12|x|xi|xii)|utbk|snbt|kuliah|mata kuliah|olimpiade)\b/;
  const smp = /\b(smp|mts|kelas\s*(7|8|9|vii|viii|ix))\b/;
  const sd = /\b(sd|mi|kelas\s*(1|2|3|4|5|6))\b/;

  if (grade === "SMA_2") {
    if (sd.test(t) || smp.test(t)) return "reject"; // SMP/SD content for an SMA student
    return "ok";
  }
  if (grade === "SMP_1") {
    if (sma.test(t)) return "reject"; // SMA content for an SMP student
    if (sd.test(t) && !smp.test(t)) return "reject";
    return "ok";
  }
  // SD_5
  if (sma.test(t) || smp.test(t)) return "reject";
  return "ok";
}

function isJunk(title) {
  const t = title.toLowerCase();
  return /#shorts|#viral|reaksi|reaction|podcast|meme|prank|tiktok|live\b/.test(t);
}

// YouTube's Indonesian locale renders lengthText as "4.27" (= 4 min 27 s) and
// "1.10.41" (= 1 h 10 min 41 s) — dot-separated, not colon. Handle both.
function durSec(d) {
  if (!d) return 0;
  const parts = d.split(/[:.]/).map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function score(topic, subject, title) {
  const t = tokens(topic);
  if (t.length === 0) {
    const subjT = tokens(subject);
    const tl = title.toLowerCase();
    return subjT.length ? subjT.filter((w) => tl.includes(w)).length / subjT.length : 0.5;
  }
  const tl = title.toLowerCase();
  const hit = t.filter((w) => tl.includes(w)).length;
  // CJK topics: any literal CJK run present in the title counts double
  const cjk = topic.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const cjkHit = cjk.filter((c) => title.includes(c)).length;
  return Math.min(1, (hit + cjkHit) / t.length);
}

// Topics that read like a full lesson objective ("Menulis teks bacaan dan kosakata
// 我叫李文 - Wǒ jiào lǐ wén") need a shorter, searchable query.
function queryFor(g, variant) {
  if (variant === "tight") return `${g.topic} ${LEVEL_QUERY[g.grade]}`;
  let base = g.topic.split(" - ")[0].trim();
  base = base.replace(/^(Melafalkan tentang cara menyebutkan|Menulis teks bacaan dan kosakata|Menganalisis|Mengidentifikasi|Memahami)\s+/i, "");
  if (base.length > 48) base = base.slice(0, 48);
  return `${base} ${g.subject} ${LEVEL_QUERY[g.grade]}`;
}

async function pass(g, creds, variant) {
  const q = queryFor(g, variant);
  const raw = await search(q, creds);
  const cands = raw
    .filter((v) => v.videoId && v.title && !isJunk(v.title))
    .map((v) => ({ ...v, score: score(g.topic, g.subject, v.title), sec: durSec(v.duration) }))
    .filter((v) => v.score >= 0.5)
    .filter((v) => v.sec === 0 ? false : v.sec >= 90 && v.sec <= 3 * 3600)
    .filter((v) => levelVerdict(g.grade, v.title, v.channel) === "ok")
    .sort((a, b) => b.score - a.score || a.sec - b.sec);

  const verified = [];
  for (const v of cands) {
    const oe = await oembed(v.videoId);
    if (oe.ok) verified.push({ ...v, oembedTitle: oe.title, oembedChannel: oe.channel });
    if (verified.length >= 3) break;
  }
  return { query: q, verified };
}

async function main() {
  const gaps = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const creds = await getCreds();
  console.log(`creds: ${creds.apiKey ? "OK" : "MISSING"}`);

  const seen = new Set();
  const todo = [];
  for (const g of gaps) {
    const key = `${g.grade}|${g.subject}|${g.topic.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    todo.push(g);
  }
  console.log(`unique gap triples: ${todo.length}\n`);

  const results = [];
  for (let i = 0; i < todo.length; i++) {
    const g = todo[i];
    let { query, verified } = await pass(g, creds, "normal");
    if (verified.length === 0) {
      const second = await pass(g, creds, "tight");
      if (second.verified.length) {
        query = second.query;
        verified = second.verified;
      }
    }
    results.push({ ...g, query, candidates: verified });
    console.log(
      `${String(i + 1).padStart(3)}/${todo.length} ${g.grade} ${g.subject} | ${g.topic.slice(0, 46).padEnd(46)} -> ${verified.length}`,
    );
  }

  fs.writeFileSync("/tmp/yt-candidates.json", JSON.stringify(results, null, 2));
  const filled = results.filter((r) => r.candidates.length > 0).length;
  console.log(`\nDONE. ${filled}/${results.length} topics got >=1 verified candidate.`);
  console.log(`EMPTY: ${results.filter((r) => !r.candidates.length).map((r) => `${r.grade} ${r.subject} | ${r.topic}`).join("\n       ") || "none"}`);
}

main();
