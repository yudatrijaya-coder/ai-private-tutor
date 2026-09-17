/**
 * Fuzzy matching between prosem (program semester) entries and Material rows.
 *
 * WHY THIS IS A MODULE AND NOT A LOCAL HELPER
 *   Two scripts need this comparison: `sync-weekorder-prosem.ts` (assigns
 *   `Material.weekOrder` from prosem weeks) and `prosem-coverage.ts` (reports
 *   which prosem sessions have no material). If each carried its own copy, the
 *   coverage report could claim a session is missing while the sync script had
 *   already matched it — the two answers would disagree, and neither would be
 *   obviously wrong. One implementation, imported by both.
 *
 * Extracted verbatim from `scripts/sync-weekorder-prosem.ts` on 2026-09-17;
 * the sync script's dry-run output was diffed before/after to confirm the move
 * changed no behaviour.
 */

/** gradeLevel enum -> prosem grade key */
export const GRADE_MAP: Record<string, string> = {
  SD_5: "v",
  SMP_1: "vii",
  SMA_2: "xi",
};

/**
 * Sessions in a prosem that are NOT content to generate: assessment, remedial,
 * exam rehearsals, reinforcement blocks.
 *
 * Bare `sumatif` matters as much as `penilaian sumatif` — the VII prosem writes
 * rows as just ". Sumatif" and those must not be reported as teaching sessions
 * without material.
 */
export const SKIP_SUBTOPIC =
  /penilaian sumatif|sumatif|remedial|total|evaluasi|asas|asesmen|tugas kuis|penguatan/i;

/**
 * SMP prosem (VII) splits sessions by the subject a specialist teaches —
 * Biologi, Fisika, Kimia, Sejarah, Geografi, Ekonomi — while the SMP curriculum
 * in the database stores the same lessons under the integrated subjects `IPA`
 * and `IPS`.
 *
 * Without this map, every SMP Biologi and Sejarah session is reported ABSENT
 * ("no material for this subject") purely because the prosem says "Biologi" and
 * the rows say "IPA". The content exists; only the label differs. Verified
 * 2026-09-17: VII Fisika "Suhu dan Kalor" sessions match IPA / "Suhu dan Kalor"
 * materials, and VII Sejarah "masa Hindu-Buddha" matches IPS / "Peninggalan
 * Sejarah".
 *
 * Applied only as a fallback: an exact subject match is always tried first, so
 * this can never shadow real materials.
 */
export const SUBJECT_ALIASES: Record<string, string[]> = {
  biologi: ["ipa"],
  fisika: ["ipa"],
  kimia: ["ipa"],
  sejarah: ["ips"],
  geografi: ["ips"],
  ekonomi: ["ips"],
  sosiologi: ["ips"],
  "ilmu pengetahuan alam": ["ipa"],
  "ilmu pengetahuan sosial": ["ips"],
};

/**
 * Curriculum subjects that share a stem but are DIFFERENT courses.
 *
 * `sim("Matematika", "Matematika Tingkat Lanjut")` returns 0.850 — the substring
 * boost (`na.includes(nb) ? 0.85 : 0`) lands one hundredth above SIM_THRESHOLD
 * (0.84). So any subject-level comparison built on `sim` alone treats the two as
 * the same course. They are not. SMA XI offers both, each with its own ProSem
 * file, and a session for one must never be satisfied by material from the other.
 *
 * The same trap applies to "Matematika Penalaran" and "Bahasa Inggris Tingkat
 * Lanjut". Rather than raise SIM_THRESHOLD — which would also break legitimate
 * label matches like "Gaya ke Atas" / "Gaya ke Atas (Archimedes)" — the
 * qualifier is compared separately: two names may only be considered the same
 * subject when both carry a qualifier or neither does.
 */
export const SUBJECT_QUALIFIER = /\b(tingkat lanjut|penalaran|lanjutan|advanced)\b/;

/** true when `s` names a course variant rather than the base course. */
export function isQualifiedSubject(s: string): boolean {
  return SUBJECT_QUALIFIER.test(s.toLowerCase());
}

/**
 * Are two curriculum subject strings the same course?
 *
 * Exact match, or a fuzzy match that survives the qualifier boundary. Aliases
 * are NOT consulted here — callers layer `SUBJECT_ALIASES` on top, because the
 * alias relation is one-way (ProSem "Biologi" is taught as curriculum "IPA",
 * but "IPA" is not a session subject).
 *
 * Verified 2026-09-17:
 *   subjectsEquivalent("Matematika", "Matematika")                        = true
 *   subjectsEquivalent("Matematika", "Matematika Tingkat Lanjut")         = false
 *   subjectsEquivalent("Matematika Tingkat Lanjut", "Matematika Tingkat Lanjut") = true
 *   subjectsEquivalent("Biologi", "Biologi")                              = true
 */
export function subjectsEquivalent(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  if (isQualifiedSubject(a) !== isQualifiedSubject(b)) return false;
  return sim(a, b) >= SIM_THRESHOLD;
}

/**
 * Every curriculum subject string that may satisfy a ProSem session subject.
 *
 * THE POINT OF THIS FUNCTION: `sync-weekorder-prosem.ts` used to test
 * `m.subject === plan.subject`, exact, while `prosem-coverage.ts` used the alias
 * union. For a VII student the ProSem says "Biologi"/"Fisika"/"Sejarah" and the
 * curriculum stores "IPA"/"IPS", so the sync script matched zero rows for three
 * of the seven subjects — `weekOrder` was never assigned, while the coverage
 * report happily called those same sessions covered. One rule, two consumers,
 * no disagreement.
 *
 * The qualifier boundary is enforced on the alias side too: "Matematika" must
 * not expand into "Matematika Tingkat Lanjut".
 */
export function acceptableSubjects(prosemSubject: string): string[] {
  const key = prosemSubject.toLowerCase();
  const aliases = SUBJECT_ALIASES[key] ?? [];
  return [key, ...aliases];
}

/** May a material filed under `materialSubject` satisfy `prosemSubject`? */
export function subjectSatisfies(prosemSubject: string, materialSubject: string): boolean {
  if (subjectsEquivalent(prosemSubject, materialSubject)) return true;
  return acceptableSubjects(prosemSubject).some((a) => norm(a) === norm(materialSubject));
}


/** Beyond this, two labels are the same thing. */
export const SIM_THRESHOLD = 0.84;
/** Lower bar used when a material already sits in a real week (1..18). */
export const PLACED_THRESHOLD = 0.9;

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

/** token-overlap + sequence similarity blend */
export function sim(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const seq = 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
  const ta = new Set(na.match(/.{1,4}/g) ?? []);
  const tb = new Set(nb.match(/.{1,4}/g) ?? []);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jacc = ta.size && tb.size ? inter / (ta.size + tb.size - inter) : 0;
  return Math.max(seq * 0.6 + jacc * 0.4, na.includes(nb) || nb.includes(na) ? 0.85 : 0);
}

/** The three label comparisons the sync script uses, in preference order. */
export function entryMaterialScore(
  entry: { topic: string; subtopic: string },
  material: { topic: string; subTopic: string | null }
): number {
  return Math.max(
    sim(entry.subtopic, material.subTopic || ""),
    sim(entry.subtopic, material.topic) * 0.9,
    sim(entry.topic, material.topic) * 0.8
  );
}

/** Words too common to carry meaning on their own. */
const STOPWORDS = new Set([
  "yang", "dan", "atau", "dengan", "untuk", "pada", "dalam", "dari", "ini", "itu",
  "adalah", "akan", "tidak", "juga", "serta", "oleh", "agar", "dapat", "secara",
  "materi", "peserta", "didik", "murid", "siswa", "kelas", "mengenai",
]);

/**
 * Chapter-level coverage: does the session's content sit inside a curriculum
 * CHAPTER name?
 *
 * WHY THIS IS SEPARATE FROM `containmentScore`: the two prosem formats label
 * their columns differently.
 *   XI  : topic = chapter ("Aljabar"),                subtopic = lesson ("Operasi pada Matriks")
 *   VII : topic = competency strand ("Pemahaman IPA"), subtopic = chapter ("Kalor")
 * So for a VII row the useful comparison is session.subtopic against
 * material.topic, not against material.subTopic. Without this, VII Fisika's
 * ". Kalor" scored 0.16 against "Kalor dan Perpindahannya" and was reported as a
 * gap even though the chapter "Suhu dan Kalor" exists with four lessons.
 *
 * One side must be fully present in the other (either direction), and at least
 * one side must carry >= 2 significant words — that keeps single-word strands
 * like "Pemahaman" from matching everything while still allowing a terse
 * session word ("Kalor") to find its chapter ("Suhu dan Kalor").
 *
 * Reported as its own verdict and listed for audit, never counted as exact
 * coverage: a chapter-level hit says the content probably exists, not that the
 * specific lesson was generated.
 */
export function chapterScore(sessionSubtopic: string, materialTopic: string): number {
  const sess = tokens(sessionSubtopic);
  const top = tokens(materialTopic);
  if (sess.length === 0 || top.length === 0) return 0;
  if (sess.length < 2 && top.length < 2) return 0;
  const [small, large] = sess.length <= top.length ? [sess, top] : [top, sess];
  for (const t of small) if (!hasToken(large, t)) return 0;
  return 1;
}

/**
 * Significant words of a label (length >= 3, no stopwords).
 * Used for containment scoring — see `containmentScore`.
 *
 * Length 3 (not 4) so short-but-meaningful Indonesian terms survive: "sel",
 * "zat", "gas". Dropping them made "Struktur dan Fungsi Sel" collapse to the
 * bare pair "struktur fungsi", which then matched any session sentence
 * containing those two generic words — a session about blood cells was
 * reported as covering the chapter "Sel".
 */
export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Do two significant words refer to the same term, allowing Indonesian
 * affixes and inflections?
 *
 * Exact equality is too strict for this corpus. The prosem and the curriculum
 * were written by different people, so the same concept appears as
 * "perpindahan" / "perpindahannya", "kalor" / "kalornya", "besaran" /
 * "besar"-derived forms, "anatagonis" / "antagonis"-style typos one column
 * apart. Without this, VII Physics ". Perpindahan kalor" scored 0.345 against
 * the existing lesson "Kalor dan Perpindahannya" and was reported as a gap.
 *
 * Two rules, both deliberately narrow:
 *   1. equal after stripping a common Indonesian suffix (-nya/-kan/-an/-i),
 *      and the stem is at least 4 characters;
 *   2. one is a prefix of the other for at least 5 characters.
 *
 * Rule 2 is what catches "-nya" families whose stems differ once stripped
 * ("perpindahan" vs "perpindahannya"). Five characters is the floor because
 * shorter prefixes start merging unrelated words ("tata" vs "tatanan").
 */
function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const strip = (t: string) => t.replace(/(nya|kan|an|i)$/, "");
  const sa = strip(a);
  const sb = strip(b);
  if (sa.length >= 4 && sa === sb) return true;
  const n = Math.min(a.length, b.length);
  return n >= 5 && a.slice(0, n) === b.slice(0, n);
}

/** Exact-or-inflected membership test for a token list. */
function hasToken(hay: string[], needle: string): boolean {
  return hay.some((h) => tokenMatch(h, needle));
}

/**
 * Is a SHORT prosem session label fully described by an existing lesson label?
 *
 * The mirror of `containmentScore`, needed because the requirement and the
 * material are labelled at different granularities. The prosem asks for
 * "2. Gaya Ke atas"; the curriculum has "Gaya ke Atas (Archimedes)". Demanding
 * the whole material label inside the session fails on the trailing
 * "(Archimedes)" even though the session is plainly that lesson.
 *
 * Only applied to short sessions (<= 3 significant words). A long session is a
 * goal sentence rather than a title, and matching those in this direction would
 * wave almost anything through.
 */
export function sessionCoveredByLabel(sessionSubtopic: string, materialLabel: string): boolean {
  const sess = tokens(sessionSubtopic);
  if (sess.length === 0 || sess.length > 3) return false;
  const hay = tokens(materialLabel);
  if (hay.length === 0) return false;
  return sess.every((t) => hasToken(hay, t));
}

/**
 * How much of `inner` (a material's lesson label) is spelled out inside
 * `outer` (a prosem session description).
 *
 * WHY THIS EXISTS: a prosem session is a full teacher sentence ("Memahami kata
 * yang jarang muncul dengan menemukan arti, kalimat perincian, dan majas
 * personifikasi.") while the material label is terse ("Kata Jarang Muncul").
 * Character containment (`includes`) fails here because an unrelated word
 * ("yang") sits between the matching words — the matcher then reported the
 * session as a gap when the material plainly covers it. Comparing significant
 * words sidesteps word order and filler entirely.
 *
 * Returns 0 when the material label has fewer than 2 significant words (too
 * short to be evidence of anything) or when `outer` is empty. Deliberately
 * asymmetric: a material label fully contained in a session description is
 * strong coverage evidence; the reverse is not.
 */
export function containmentScore(outer: string, inner: string): number {
  const toks = tokens(inner);
  if (toks.length < 2) return 0;
  const hay = tokens(outer);
  if (hay.length === 0) return 0;
  let hit = 0;
  for (const t of toks) if (hasToken(hay, t)) hit++;
  return hit / toks.length;
}

/**
 * Coverage verdict for one prosem session against one curriculum.
 * `CONTAINED` means the session text spells out an existing material's lesson
 * label **in full** — the material exists, it is just named more tersely.
 *
 * Set to 1.0 (every significant word present) on purpose. A partial-overlap
 * threshold approved bad matches: "Struktur dan Fungsi Sel" scored 0.67 against
 * a sentence about the respiratory system, and a session about blood cells was
 * waved through as covering the chapter "Sel". Requiring the complete label
 * makes a CONTAINED verdict checkable by eye — you can see the material's name
 * sitting inside the session text.
 *
 * Only ever applied to `subTopic` (the lesson), never to `topic` (the chapter).
 * A chapter name inside a session sentence is not evidence of anything — most
 * sessions in a chapter mention it.
 */
export const CONTAINMENT_THRESHOLD = 1.0;

